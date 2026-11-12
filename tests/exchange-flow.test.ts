import { beforeEach, describe, expect, it } from 'vitest';
import { handleCreateGroup } from '../netlify/functions/create-group.mts';
import { handleGetGroup } from '../netlify/functions/get-group.mts';
import { handleJoinGroup } from '../netlify/functions/join-group.mts';
import { MemoryStorageAdapter, setStorageAdapter } from '../netlify/functions/lib/store';
import { handleOrganizerGroup } from '../netlify/functions/organizer-group.mts';
import { handleParticipantSession } from '../netlify/functions/participant-session.mts';
import { handleRecoverLink } from '../netlify/functions/recover-link.mts';
import { handleStartDraw } from '../netlify/functions/start-draw.mts';
import { handleUpdateGiftProgress } from '../netlify/functions/update-gift-progress.mts';
import { handleUpdateWishlist } from '../netlify/functions/update-wishlist.mts';
import type {
  CreateGroupResponse,
  JoinGroupResponse,
  OrganizerGroupView,
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

describe('Mystery Exchange End-to-End API & Security', () => {
  const memStore = new MemoryStorageAdapter();

  beforeEach(() => {
    memStore.clear();
    setStorageAdapter(memStore);
  });

  it('rejects unauthorized organizer access and invalid participant tokens', async () => {
    const createRes = await handleCreateGroup(
      jsonReq('http://localhost/api/create-group', 'POST', {
        groupName: 'Test Exchange',
        budget: { amount: 500, currency: 'PHP' },
        settings: { maxParticipants: 10 },
      })
    );
    expect(createRes.status).toBe(201);
    const { groupId } = (await createRes.json()) as CreateGroupResponse;

    const noAuth = await handleOrganizerGroup(
      jsonReq(`http://localhost/api/organizer/${groupId}`, 'GET'),
      groupId
    );
    expect(noAuth.status).toBe(401);

    const wrongAuth = await handleOrganizerGroup(
      jsonReq(`http://localhost/api/organizer/${groupId}`, 'GET', undefined, 'org_wrong_token'),
      groupId
    );
    expect(wrongAuth.status).toBe(403);

    const badParticipant = await handleParticipantSession(
      jsonReq('http://localhost/api/participant/session', 'GET', undefined, 'prt_nonexistent')
    );
    expect(badParticipant.status).toBe(404);
  });

  it('rejects unsafe javascript: URLs in wishlist items', async () => {
    const createRes = await handleCreateGroup(
      jsonReq('http://localhost/api/create-group', 'POST', {
        groupName: 'URL Safety Test',
        budget: { amount: 500, currency: 'PHP' },
        settings: { maxParticipants: 10 },
      })
    );
    const { groupId } = (await createRes.json()) as CreateGroupResponse;

    const joinRes = await handleJoinGroup(
      jsonReq('http://localhost/api/join-group', 'POST', {
        groupId,
        songTitle: 'Safe Song',
        wishlist: [
          {
            name: 'Sketchy Link',
            description: '',
            category: 'Other',
            priority: 'nice_to_have',
            productUrl: 'javascript:alert(1)',
          },
        ],
      })
    );
    expect(joinRes.status).toBe(400);
  });

  it('enforces draw preconditions and prevents duplicate draws or post-draw resets', async () => {
    const createRes = await handleCreateGroup(
      jsonReq('http://localhost/api/create-group', 'POST', {
        groupName: 'Precondition Test',
        budget: { amount: 500, currency: 'PHP' },
        settings: { maxParticipants: 5 },
      })
    );
    const { groupId, organizerToken } = (await createRes.json()) as CreateGroupResponse;

    // Join only 2 participants (< 3 minimum)
    for (const song of ['Song One', 'Song Two']) {
      const res = await handleJoinGroup(
        jsonReq('http://localhost/api/join-group', 'POST', {
          groupId,
          songTitle: song,
          wishlist: [{ name: `Gift for ${song}`, description: '', category: 'Other', priority: 'nice_to_have' }],
        })
      );
      expect(res.status).toBe(201);
    }

    // Cannot start draw while registration is open
    const drawWhileOpen = await handleStartDraw(
      jsonReq('http://localhost/api/start-draw', 'POST', { groupId }, organizerToken)
    );
    expect(drawWhileOpen.status).toBe(409);

    // Close registration
    await handleOrganizerGroup(
      jsonReq(`http://localhost/api/organizer/${groupId}`, 'PATCH', { action: 'close_registration' }, organizerToken),
      groupId
    );

    // Cannot start draw with only 2 participants
    const drawTooFew = await handleStartDraw(
      jsonReq('http://localhost/api/start-draw', 'POST', { groupId }, organizerToken)
    );
    expect(drawTooFew.status).toBe(409);

    // Reopen and add 3rd participant
    await handleOrganizerGroup(
      jsonReq(`http://localhost/api/organizer/${groupId}`, 'PATCH', { action: 'reopen_registration' }, organizerToken),
      groupId
    );
    const join3 = await handleJoinGroup(
      jsonReq('http://localhost/api/join-group', 'POST', {
        groupId,
        songTitle: 'Song Three',
        wishlist: [{ name: 'Gift for Song Three', description: '', category: 'Books', priority: 'must_have' }],
      })
    );
    expect(join3.status).toBe(201);

    await handleOrganizerGroup(
      jsonReq(`http://localhost/api/organizer/${groupId}`, 'PATCH', { action: 'close_registration' }, organizerToken),
      groupId
    );

    // First draw succeeds
    const draw1 = await handleStartDraw(
      jsonReq('http://localhost/api/start-draw', 'POST', { groupId }, organizerToken)
    );
    expect(draw1.status).toBe(200);

    // Second draw fails because it is already drawn
    const draw2 = await handleStartDraw(
      jsonReq('http://localhost/api/start-draw', 'POST', { groupId }, organizerToken)
    );
    expect(draw2.status).toBe(409);

    // Reset after draw resets group to CREATED so it can be reused
    const resetAfterDraw = await handleOrganizerGroup(
      jsonReq(`http://localhost/api/organizer/${groupId}`, 'PATCH', { action: 'reset_group' }, organizerToken),
      groupId
    );
    expect(resetAfterDraw.status).toBe(200);
    const { group: resetGroup } = (await resetAfterDraw.json()) as { group: OrganizerGroupView };
    expect(resetGroup.status).toBe('CREATED');
    expect(resetGroup.participantCount).toBe(0);
  });

  it('passes Final Acceptance Scenario: Christmas Mystery Exchange 2026 (10 participants, ₱500, Dec 25 2026)', async () => {
    // 1. Organizer creates group
    const createRes = await handleCreateGroup(
      jsonReq('http://localhost/api/create-group', 'POST', {
        groupName: 'Christmas Mystery Exchange 2026',
        category: 'Christmas',
        eventDate: '2026-12-25',
        budget: { amount: 500, currency: 'PHP' },
        settings: {
          maxParticipants: 10,
          maxWishlistItems: 20,
          allowEditBeforeDraw: true,
          allowEditAfterDraw: false,
          requireCompletedWishlist: true,
        },
      })
    );
    expect(createRes.status).toBe(201);
    const { groupId, organizerToken } = (await createRes.json()) as CreateGroupResponse;

    // Public group info should not leak anything private
    const publicRes = await handleGetGroup(jsonReq(`http://localhost/api/group/${groupId}`, 'GET'), groupId);
    expect(publicRes.status).toBe(200);

    // 2. Ten participants join separately with unique songs and wishlists
    const participants: { songTitle: string; itemName: string; privateToken: string }[] = [];
    for (let i = 1; i <= 10; i++) {
      const songTitle = `Mystery Song #${i}`;
      const itemName = `Thoughtful Gift #${i}`;
      const joinRes = await handleJoinGroup(
        jsonReq('http://localhost/api/join-group', 'POST', {
          groupId,
          songTitle,
          artist: `Artist ${i}`,
          wishlist: [
            {
              name: itemName,
              description: `Wishlist description for ${songTitle}`,
              category: 'Hobbies',
              estimatedPrice: 450,
              priority: 'must_have',
            },
          ],
          preferences: { preferredColors: 'Forest Green' },
        })
      );
      expect(joinRes.status).toBe(201);
      const body = (await joinRes.json()) as JoinGroupResponse;
      participants.push({ songTitle, itemName, privateToken: body.privateToken });
    }

    // Verify song identity cannot be changed on wishlist update, while wishlist updates work
    const updateWlRes = await handleUpdateWishlist(
      jsonReq(
        'http://localhost/api/participant/wishlist',
        'PUT',
        {
          songTitle: 'Hacked Song',
          wishlist: [
            {
              name: 'Thoughtful Gift #1',
              description: 'Updated description',
              category: 'Hobbies',
              estimatedPrice: 480,
              priority: 'must_have',
            },
          ],
        },
        participants[0].privateToken
      )
    );
    expect(updateWlRes.status).toBe(200);

    // 3. Organizer sees 10/10 participants and 10/10 wishlists, and NO songs/wishlists/assignments
    const orgViewRes = await handleOrganizerGroup(
      jsonReq(`http://localhost/api/organizer/${groupId}`, 'GET', undefined, organizerToken),
      groupId
    );
    expect(orgViewRes.status).toBe(200);
    const { group: orgGroup } = (await orgViewRes.json()) as { group: OrganizerGroupView };
    expect(orgGroup.participantCount).toBe(10);
    expect(orgGroup.completedWishlistCount).toBe(10);

    const orgJson = JSON.stringify(orgGroup);
    expect(orgJson).not.toContain('Thoughtful Gift #1');
    expect(orgJson).not.toContain('participantIds');

    // 4. Close registration & start draw
    await handleOrganizerGroup(
      jsonReq(`http://localhost/api/organizer/${groupId}`, 'PATCH', { action: 'close_registration' }, organizerToken),
      groupId
    );
    const drawRes = await handleStartDraw(
      jsonReq('http://localhost/api/start-draw', 'POST', { groupId }, organizerToken)
    );
    expect(drawRes.status).toBe(200);
    const drawBody = (await drawRes.json()) as { group: OrganizerGroupView };
    expect(drawBody.group.status).toBe('DRAWN');
    expect(JSON.stringify(drawBody)).not.toContain('Thoughtful Gift');
    expect(JSON.stringify(drawBody)).not.toContain('recipientParticipantId');

    // 5. All 10 participants open their private results
    const assignedRecipients = new Set<string>();
    for (const p of participants) {
      const sessRes = await handleParticipantSession(
        jsonReq('http://localhost/api/participant/session', 'GET', undefined, p.privateToken)
      );
      expect(sessRes.status).toBe(200);
      const { session } = (await sessRes.json()) as { session: ParticipantSessionView };

      expect(session.songTitle).toBe(p.songTitle); // Song remained locked
      expect(session.assignment).toBeDefined();
      expect(session.assignment!.songTitle).not.toBe(p.songTitle); // Nobody receives themselves

      // Verify song & wishlist pairing is exact
      const expectedNum = session.assignment!.songTitle.replace('Mystery Song #', '');
      expect(session.assignment!.wishlist[0].name).toBe(`Thoughtful Gift #${expectedNum}`);

      assignedRecipients.add(session.assignment!.songTitle);
    }

    // Every participant assigned exactly once
    expect(assignedRecipients.size).toBe(10);

    // 6. Private gift notes remain private to gift-giver
    const notesRes = await handleUpdateGiftProgress(
      jsonReq(
        'http://localhost/api/participant/gift-progress',
        'PUT',
        {
          checklist: {
            reviewedWishlist: true,
            choseGift: true,
            purchasedGift: false,
            wrappedGift: false,
            readyToBring: false,
          },
          privateNotes: 'Secretly buying wrapping paper!',
        },
        participants[0].privateToken
      )
    );
    expect(notesRes.status).toBe(200);

    const p1SessionAfter = await (
      await handleParticipantSession(
        jsonReq('http://localhost/api/participant/session', 'GET', undefined, participants[0].privateToken)
      )
    ).json();
    expect(p1SessionAfter.session.giftProgress.privateNotes).toBe('Secretly buying wrapping paper!');
  });

  it('supports self-service link recovery and anonymous slot removal before draw', async () => {
    const createRes = await handleCreateGroup(
      jsonReq('http://localhost/api/create-group', 'POST', {
        groupName: 'Recovery & Slot Removal Test',
        budget: { amount: 500, currency: 'PHP' },
        settings: { maxParticipants: 10 },
      })
    );
    const { groupId, organizerToken } = (await createRes.json()) as CreateGroupResponse;

    const join1 = await handleJoinGroup(
      jsonReq('http://localhost/api/join-group', 'POST', {
        groupId,
        songTitle: 'Goodness of God',
        recoveryPhrase: 'grace2026',
        wishlist: [{ name: 'Study Bible', description: '', category: 'Books', priority: 'must_have' }],
      })
    );
    expect(join1.status).toBe(201);
    const body1 = (await join1.json()) as JoinGroupResponse;

    const join2 = await handleJoinGroup(
      jsonReq('http://localhost/api/join-group', 'POST', {
        groupId,
        songTitle: 'Friend of God',
        wishlist: [],
      })
    );
    expect(join2.status).toBe(201);
    const body2 = (await join2.json()) as JoinGroupResponse;

    // Wrong recovery phrase fails
    const badRecover = await handleRecoverLink(
      jsonReq('http://localhost/api/recover-link', 'POST', {
        groupId,
        songTitle: 'Goodness of God',
        recoveryPhrase: 'wrong-phrase',
      })
    );
    expect(badRecover.status).toBe(403);

    // Valid recovery phrase rotates token and invalidates old token
    const goodRecover = await handleRecoverLink(
      jsonReq('http://localhost/api/recover-link', 'POST', {
        groupId,
        songTitle: 'Goodness of God',
        recoveryPhrase: 'grace2026',
      })
    );
    expect(goodRecover.status).toBe(200);
    const recovered = (await goodRecover.json()) as { privateToken: string; isDrawn: boolean };
    expect(recovered.privateToken).not.toBe(body1.privateToken);

    const oldSess = await handleParticipantSession(
      jsonReq('http://localhost/api/participant/session', 'GET', undefined, body1.privateToken)
    );
    expect(oldSess.status).toBe(404);

    const newSess = await handleParticipantSession(
      jsonReq('http://localhost/api/participant/session', 'GET', undefined, recovered.privateToken)
    );
    expect(newSess.status).toBe(200);

    // Organizer sees 2 slots with song titles (for link management) and removes slot #2
    const orgRes = await handleOrganizerGroup(
      jsonReq(`http://localhost/api/organizer/${groupId}`, 'GET', undefined, organizerToken),
      groupId
    );
    const { group: orgGroup } = (await orgRes.json()) as { group: OrganizerGroupView };
    expect(orgGroup.anonymousSlots).toHaveLength(2);
    expect(orgGroup.anonymousSlots[0].songTitle).toBe('Goodness of God');
    expect(JSON.stringify(orgGroup)).not.toContain('Study Bible');

    // Organizer can regenerate a participant's link along with the song title
    const regenRes = await handleOrganizerGroup(
      jsonReq(
        `http://localhost/api/organizer/${groupId}`,
        'PATCH',
        { action: 'regenerate_participant_link', slotId: orgGroup.anonymousSlots[0].slotId },
        organizerToken
      ),
      groupId
    );
    expect(regenRes.status).toBe(200);
    const regenBody = (await regenRes.json()) as { privateToken: string; songTitle: string };
    expect(regenBody.songTitle).toBe('Goodness of God');
    expect(regenBody.privateToken).toMatch(/^prt_/);

    const removeRes = await handleOrganizerGroup(
      jsonReq(
        `http://localhost/api/organizer/${groupId}`,
        'PATCH',
        { action: 'remove_participant', slotId: orgGroup.anonymousSlots[1].slotId },
        organizerToken
      ),
      groupId
    );
    expect(removeRes.status).toBe(200);
    const { group: afterRemove } = (await removeRes.json()) as { group: OrganizerGroupView };
    expect(afterRemove.participantCount).toBe(1);
    expect(afterRemove.anonymousSlots).toHaveLength(1);

    // Removed participant's token is invalidated
    const removedSess = await handleParticipantSession(
      jsonReq('http://localhost/api/participant/session', 'GET', undefined, body2.privateToken)
    );
    expect(removedSess.status).toBe(404);
  });
});
