import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCreateGroup } from '../netlify/functions/create-group.mts';
import { handleJoinGroup } from '../netlify/functions/join-group.mts';
import { MemoryStorageAdapter, setStorageAdapter } from '../netlify/functions/lib/store';
import { handleParticipantSession } from '../netlify/functions/participant-session.mts';
import { handleWheel } from '../netlify/functions/wheel.mts';
import type {
  CreateGroupResponse,
  JoinGroupResponse,
  WheelViewState,
  WheelWinnerRecord,
  ParticipantSessionView,
} from '../src/types/exchange';

function jsonReq(url: string, method: string, body?: unknown, token?: string): Request {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return new Request(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('Wheel of Songs / Spin the Wheel Feature', () => {
  const memStore = new MemoryStorageAdapter();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-01T12:00:00Z'));
    memStore.clear();
    setStorageAdapter(memStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles duplicate song titles independently and notifies only the winning participant', async () => {
    // 1. Create group with enableWheel = true
    const createRes = await handleCreateGroup(
      jsonReq('http://localhost/api/create-group', 'POST', {
        groupName: 'Musical Holiday Exchange',
        category: 'Christmas',
        budget: { amount: 500, currency: 'PHP' },
        settings: { maxParticipants: 10, enableWheel: true },
      })
    );
    expect(createRes.status).toBe(201);
    const { groupId, organizerToken } = (await createRes.json()) as CreateGroupResponse;

    // 2. Participant A submits "Perfect" by "Ed Sheeran"
    const joinARes = await handleJoinGroup(
      jsonReq('http://localhost/api/join-group', 'POST', {
        groupId,
        songTitle: 'Perfect',
        artist: 'Ed Sheeran',
        wishlist: [{ name: 'Acoustic Guitar Strings', estimatedPrice: 350 }],
      })
    );
    expect(joinARes.status).toBe(201);
    const partA = (await joinARes.json()) as JoinGroupResponse;

    // 3. Participant B ALSO submits "Perfect" by "Ed Sheeran" (identical duplicate song!)
    const joinBRes = await handleJoinGroup(
      jsonReq('http://localhost/api/join-group', 'POST', {
        groupId,
        songTitle: 'Perfect',
        artist: 'Ed Sheeran',
        wishlist: [{ name: 'Vinyl Record', estimatedPrice: 450 }],
      })
    );
    expect(joinBRes.status).toBe(201);
    const partB = (await joinBRes.json()) as JoinGroupResponse;

    // 4. Participant C submits "Yellow" by "Coldplay"
    const joinCRes = await handleJoinGroup(
      jsonReq('http://localhost/api/join-group', 'POST', {
        groupId,
        songTitle: 'Yellow',
        artist: 'Coldplay',
        wishlist: [{ name: 'Yellow Hoodie', estimatedPrice: 500 }],
      })
    );
    expect(joinCRes.status).toBe(201);
    const partC = (await joinCRes.json()) as JoinGroupResponse;

    // 5. Spectator calls GET /api/wheel/:groupId without organizer token
    const spectatorGet = await handleWheel(
      jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET'),
      groupId
    );
    expect(spectatorGet.status).toBe(200);
    const spectatorView = (await spectatorGet.json()) as WheelViewState;
    expect(spectatorView.isOrganizer).toBe(false);
    expect(spectatorView.enabled).toBe(true);

    // CRITICAL: Both duplicate "Perfect" entries must exist as distinct entries
    expect(spectatorView.entries.length).toBe(3);
    const perfectEntries = spectatorView.entries.filter((e) => e.songTitle === 'Perfect');
    expect(perfectEntries.length).toBe(2);
    expect(perfectEntries[0].id).not.toBe(perfectEntries[1].id);
    expect(perfectEntries[0].participantId).not.toBe(perfectEntries[1].participantId);

    // Spectator CANNOT spin or edit wheel
    const spectatorSpin = await handleWheel(
      jsonReq(`http://localhost/api/wheel/${groupId}/spin`, 'POST', {
        entryId: perfectEntries[0].id,
      }),
      groupId,
      'spin'
    );
    expect(spectatorSpin.status).toBe(403);

    // 6. Organizer checks state
    const organizerGet = await handleWheel(
      jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET', undefined, organizerToken),
      groupId
    );
    expect(organizerGet.status).toBe(200);
    const organizerView = (await organizerGet.json()) as WheelViewState;
    expect(organizerView.isOrganizer).toBe(true);

    // Find Participant B's entry (Slot #2)
    const entryB = organizerView.entries.find((e) => e.slotNumber === 2);
    expect(entryB).toBeDefined();

    // 7. Organizer spins and Participant B's entry wins
    const spinRes = await handleWheel(
      jsonReq(
        `http://localhost/api/wheel/${groupId}/spin`,
        'POST',
        { entryId: entryB!.id },
        organizerToken
      ),
      groupId,
      'spin'
    );
    expect(spinRes.status).toBe(200);
    const spinData = (await spinRes.json()) as {
      success: boolean;
      winner: WheelWinnerRecord;
      remainingCount: number;
    };
    expect(spinData.success).toBe(true);
    expect(spinData.winner.order).toBe(1);
    expect(spinData.winner.songTitle).toBe('Perfect');
    expect(spinData.winner.artist).toBe('Ed Sheeran');
    expect(spinData.winner.slotNumber).toBe(2);
    expect(spinData.winner.wishlistSummary?.[0]?.name).toBe('Vinyl Record');

    // CRITICAL: Only Participant B's entry was removed from active wheel.
    // Participant A's identical "Perfect" entry MUST still be on the wheel!
    expect(spinData.remainingCount).toBe(2);

    // 8. VERIFY DELAYED REVEAL (Premature winner reveal prevention):
    // Immediately after spin (while wheel is spinning):
    // Participant B does NOT see winner notification ahead of wheel stopping
    const immediateSessionB = ((await (await handleParticipantSession(
      jsonReq('http://localhost/api/participant/session', 'GET', undefined, partB.privateToken)
    )).json()) as { session: ParticipantSessionView }).session;
    expect(immediateSessionB.wheelWins).toBeUndefined();

    // Spectator view keeps all entries during the spin so the wheel does not update prematurely
    const spectatorPostSpin = (await (await handleWheel(
      jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET'),
      groupId
    )).json()) as WheelViewState;
    expect(spectatorPostSpin.entries.length).toBe(3);
    expect(spectatorPostSpin.winnerHistory.length).toBe(0);
    expect(spectatorPostSpin.currentSpin).toBeDefined();
    expect(spectatorPostSpin.currentSpin?.entryId).toBe(entryB!.id);

    // Organizer view does NOT prematurely reveal winner in history before Continue is clicked!
    const organizerPostSpin = (await (await handleWheel(
      jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET', undefined, organizerToken),
      groupId
    )).json()) as WheelViewState;
    expect(organizerPostSpin.winnerHistory.length).toBe(0);

    // 9. ORGANIZER CLICKS "CONTINUE" IN WINNER MODAL (reveals winner into history & removes entry):
    const revealRes = await handleWheel(
      jsonReq(
        `http://localhost/api/wheel/${groupId}/reveal`,
        'POST',
        { winnerId: spinData.winner.winnerId },
        organizerToken
      ),
      groupId,
      'reveal'
    );
    expect(revealRes.status).toBe(200);

    const postSpinGet = await handleWheel(
      jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET'),
      groupId
    );
    const postSpinView = (await postSpinGet.json()) as WheelViewState;
    expect(postSpinView.entries.length).toBe(2);
    expect(postSpinView.winnerHistory.length).toBe(1);

    const remainingA = postSpinView.entries.find((e) => e.slotNumber === 1);
    expect(remainingA).toBeDefined();
    expect(remainingA?.songTitle).toBe('Perfect');

    const checkRemovedB = postSpinView.entries.find((e) => e.slotNumber === 2);
    expect(checkRemovedB).toBeUndefined();

    // 10. VERIFY PARTICIPANT PRIVATE LINK NOTIFICATIONS:
    // Only Participant B must receive the celebration notification!
    const sessionBRes = await handleParticipantSession(
      jsonReq('http://localhost/api/participant/session', 'GET', undefined, partB.privateToken)
    );
    expect(sessionBRes.status).toBe(200);
    const sessionB = ((await sessionBRes.json()) as { session: ParticipantSessionView }).session;
    expect(sessionB.wheelWins).toBeDefined();
    expect(sessionB.wheelWins?.length).toBe(1);
    expect(sessionB.wheelWins?.[0].order).toBe(1);
    expect(sessionB.wheelWins?.[0].songTitle).toBe('Perfect');

    // Participant A (identical song) must NOT receive a winner notification!
    const sessionARes = await handleParticipantSession(
      jsonReq('http://localhost/api/participant/session', 'GET', undefined, partA.privateToken)
    );
    expect(sessionARes.status).toBe(200);
    const sessionA = ((await sessionARes.json()) as { session: ParticipantSessionView }).session;
    expect(sessionA.wheelWins).toBeUndefined();

    // Participant C must NOT receive a winner notification!
    const sessionCRes = await handleParticipantSession(
      jsonReq('http://localhost/api/participant/session', 'GET', undefined, partC.privateToken)
    );
    expect(sessionCRes.status).toBe(200);
    const sessionC = ((await sessionCRes.json()) as { session: ParticipantSessionView }).session;
    expect(sessionC.wheelWins).toBeUndefined();
  });

  it('supports entry management (add, edit, exclude, remove) without affecting participant records', async () => {
    const createRes = await handleCreateGroup(
      jsonReq('http://localhost/api/create-group', 'POST', {
        groupName: 'Party Wheel Group',
        budget: { amount: 300, currency: 'USD' },
        settings: { maxParticipants: 5 },
      })
    );
    const { groupId, organizerToken } = (await createRes.json()) as CreateGroupResponse;

    const joinRes = await handleJoinGroup(
      jsonReq('http://localhost/api/join-group', 'POST', {
        groupId,
        songTitle: 'Original Song',
        artist: 'Original Artist',
      })
    );
    const part = (await joinRes.json()) as JoinGroupResponse;

    // Add manual entry
    const addRes = await handleWheel(
      jsonReq(
        `http://localhost/api/wheel/${groupId}/entries`,
        'POST',
        { subOp: 'add', songTitle: 'Bonus Mystery Song', artist: 'Special Guest' },
        organizerToken
      ),
      groupId,
      'entries'
    );
    expect(addRes.status).toBe(200);

    const viewAfterAdd = (await (
      await handleWheel(jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET'), groupId)
    ).json()) as WheelViewState;
    expect(viewAfterAdd.entries.length).toBe(2);
    const manualEntry = viewAfterAdd.entries.find((e) => e.source === 'manual');
    expect(manualEntry?.songTitle).toBe('Bonus Mystery Song');

    // Edit entry
    const editRes = await handleWheel(
      jsonReq(
        `http://localhost/api/wheel/${groupId}/entries`,
        'POST',
        { subOp: 'edit', entryId: manualEntry!.id, songTitle: 'Updated Song Title' },
        organizerToken
      ),
      groupId,
      'entries'
    );
    expect(editRes.status).toBe(200);

    // Toggle exclude
    const excludeRes = await handleWheel(
      jsonReq(
        `http://localhost/api/wheel/${groupId}/entries`,
        'POST',
        { subOp: 'toggle_exclude', entryId: manualEntry!.id },
        organizerToken
      ),
      groupId,
      'entries'
    );
    expect(excludeRes.status).toBe(200);

    const viewAfterExclude = (await (
      await handleWheel(jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET'), groupId)
    ).json()) as WheelViewState;
    const excludedEntry = viewAfterExclude.entries.find((e) => e.id === manualEntry!.id);
    expect(excludedEntry?.excluded).toBe(true);
    expect(viewAfterExclude.totalActiveCount).toBe(1);
    expect(viewAfterExclude.totalExcludedCount).toBe(1);

    // Participant record in database remains completely untouched
    const sessionRes = await handleParticipantSession(
      jsonReq('http://localhost/api/participant/session', 'GET', undefined, part.privateToken)
    );
    const session = ((await sessionRes.json()) as { session: ParticipantSessionView }).session;
    expect(session.songTitle).toBe('Original Song');
    expect(session.artist).toBe('Original Artist');
  });

  it('resets the wheel for another round while strictly preserving winner history', async () => {
    const createRes = await handleCreateGroup(
      jsonReq('http://localhost/api/create-group', 'POST', {
        groupName: 'Multi-Round Wheel',
        budget: { amount: 500, currency: 'PHP' },
        settings: { maxParticipants: 5 },
      })
    );
    const { groupId, organizerToken } = (await createRes.json()) as CreateGroupResponse;

    const joinRes1 = await handleJoinGroup(
      jsonReq('http://localhost/api/join-group', 'POST', {
        groupId,
        songTitle: 'Song One',
      })
    );
    expect(joinRes1.status).toBe(201);

    const joinRes2 = await handleJoinGroup(
      jsonReq('http://localhost/api/join-group', 'POST', {
        groupId,
        songTitle: 'Song Two',
      })
    );
    expect(joinRes2.status).toBe(201);

    // Load wheel
    const initialView = (await (
      await handleWheel(jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET'), groupId)
    ).json()) as WheelViewState;
    expect(initialView.entries.length).toBe(2);

    // Spin 1: Song One wins (order 1)
    const entry1 = initialView.entries.find((e) => e.slotNumber === 1)!;
    const spin1 = await handleWheel(
      jsonReq(
        `http://localhost/api/wheel/${groupId}/spin`,
        'POST',
        { entryId: entry1.id },
        organizerToken
      ),
      groupId,
      'spin'
    );
    expect(spin1.status).toBe(200);
    // Organizer clicks Continue in modal
    await handleWheel(
      jsonReq(`http://localhost/api/wheel/${groupId}/reveal`, 'POST', {}, organizerToken),
      groupId,
      'reveal'
    );

    // Spin 2: Song Two wins (order 2)
    const entry2 = initialView.entries.find((e) => e.slotNumber === 2)!;
    const spin2 = await handleWheel(
      jsonReq(
        `http://localhost/api/wheel/${groupId}/spin`,
        'POST',
        { entryId: entry2.id },
        organizerToken
      ),
      groupId,
      'spin'
    );
    expect(spin2.status).toBe(200);
    // Organizer clicks Continue in modal
    await handleWheel(
      jsonReq(`http://localhost/api/wheel/${groupId}/reveal`, 'POST', {}, organizerToken),
      groupId,
      'reveal'
    );

    // All active songs won
    const emptyView = (await (
      await handleWheel(jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET'), groupId)
    ).json()) as WheelViewState;
    expect(emptyView.entries.length).toBe(0);
    expect(emptyView.winnerHistory.length).toBe(2);

    // RESET WHEEL FOR ANOTHER ROUND (clears history to start again from 1st winner)
    const resetRes = await handleWheel(
      jsonReq(`http://localhost/api/wheel/${groupId}/reset`, 'POST', {}, organizerToken),
      groupId,
      'reset'
    );
    expect(resetRes.status).toBe(200);

    const resetView = (await (
      await handleWheel(jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET'), groupId)
    ).json()) as WheelViewState;

    // Entries are restored back to active wheel
    expect(resetView.entries.length).toBe(2);
    expect(resetView.entries.every((e) => !e.excluded)).toBe(true);

    // Winner history is cleared to start again at the first winner
    expect(resetView.winnerHistory.length).toBe(0);

    // In Round 2, Song Two wins again -> order starts at 1st winner!
    const entry2Again = resetView.entries.find((e) => e.slotNumber === 2)!;
    const spin3 = await handleWheel(
      jsonReq(
        `http://localhost/api/wheel/${groupId}/spin`,
        'POST',
        { entryId: entry2Again.id },
        organizerToken
      ),
      groupId,
      'spin'
    );
    const spin3Data = (await spin3.json()) as { winner: WheelWinnerRecord };
    expect(spin3Data.winner.order).toBe(1);

    // Organizer clicks Continue in modal
    await handleWheel(
      jsonReq(`http://localhost/api/wheel/${groupId}/reveal`, 'POST', {}, organizerToken),
      groupId,
      'reveal'
    );

    const finalView = (await (
      await handleWheel(jsonReq(`http://localhost/api/wheel/${groupId}`, 'GET'), groupId)
    ).json()) as WheelViewState;
    expect(finalView.winnerHistory.length).toBe(1);
    expect(finalView.winnerHistory[0].order).toBe(1);
  });
});
