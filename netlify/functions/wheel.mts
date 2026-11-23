import type { Config, Context } from '@netlify/functions';
import { hashToken, timingSafeEqualHex, verifySuperAdminToken } from './lib/crypto';
import { errorResponse, extractBearerToken, jsonResponse, parseJsonBody } from './lib/http';
import {
  getStorage,
  keys,
  type GroupRecord,
  type SubmissionRecord,
  type WheelEntry,
  type WheelStateRecord,
  type WheelViewState,
  type WheelWinnerRecord,
} from './lib/store';

async function checkOrganizerAuth(
  group: GroupRecord,
  req: Request
): Promise<boolean> {
  let token = extractBearerToken(req);
  if (!token) {
    token = req.headers.get('x-organizer-token');
  }
  if (!token) {
    try {
      const url = new URL(req.url);
      token = url.searchParams.get('token');
    } catch {
      // Ignore URL parsing errors
    }
  }

  if (!token) {
    return false;
  }

  if (verifySuperAdminToken(token)) {
    return true;
  }

  const incomingHash = hashToken(token);
  return timingSafeEqualHex(incomingHash, group.organizerTokenHash);
}

export async function handleWheel(
  req: Request,
  groupId: string,
  subAction = ''
): Promise<Response> {
  if (!groupId || groupId.length > 64) {
    return errorResponse('Invalid group ID.', 400);
  }

  const storage = getStorage();
  const group = await storage.getJSON<GroupRecord>(keys.group(groupId));
  if (!group) {
    return errorResponse('Exchange group not found.', 404);
  }

  const isOrganizer = await checkOrganizerAuth(group, req);

  // Load or initialize wheel state
  let wheelState = await storage.getJSON<WheelStateRecord>(keys.wheel(groupId));
  if (!wheelState) {
    wheelState = {
      groupId,
      entries: [],
      winnerHistory: [],
      updatedAt: new Date().toISOString(),
    };
  }

  // Ensure entries and winnerHistory are arrays
  if (!Array.isArray(wheelState.entries)) wheelState.entries = [];
  if (!Array.isArray(wheelState.winnerHistory)) wheelState.winnerHistory = [];

  // Auto-sync entries with participants from group.participantIds
  // A participant slot is added if it is not currently in entries AND not in winnerHistory
  let stateModified = false;
  const existingEntryParticipantIds = new Set(wheelState.entries.map((e: WheelEntry) => e.participantId));
  const existingWinnerParticipantIds = new Set(wheelState.winnerHistory.map((w: WheelWinnerRecord) => w.participantId));

  for (let i = 0; i < group.participantIds.length; i++) {
    const pid = group.participantIds[i];
    // If this participant is not in active entries and hasn't already won
    if (!existingEntryParticipantIds.has(pid) && !existingWinnerParticipantIds.has(pid)) {
      const sub = await storage.getJSON<SubmissionRecord>(keys.submission(groupId, pid));
      const songTitle =
        sub?.songTitle || group.participantSummaries?.[pid]?.songTitle || `Participant #${i + 1}`;
      const artist = sub?.artist || group.participantSummaries?.[pid]?.artist;

      const newEntry: WheelEntry = {
        id: `entry_${pid}`,
        participantId: pid,
        songTitle,
        artist,
        slotNumber: i + 1,
        excluded: false,
        source: 'participant',
        createdAt: sub?.createdAt || new Date().toISOString(),
      };
      wheelState.entries.push(newEntry);
      existingEntryParticipantIds.add(pid);
      stateModified = true;
    }
  }

  if (stateModified) {
    wheelState.updatedAt = new Date().toISOString();
    await storage.setJSON(keys.wheel(groupId), wheelState);
  }

  if (req.method === 'GET') {
    const nowMs = Date.now();
    // Winners are only visible in history once revealed!
    // (revealedAt is set when organizer clicks Continue in modal, or fallback revealAt elapsed)
    const visibleHistory = wheelState.winnerHistory.filter(
      (w: WheelWinnerRecord) => !!w.revealedAt || (w.revealAt && Date.parse(w.revealAt) <= nowMs)
    );

    // Any winning entry that has NOT been revealed yet stays in visibleEntries
    // so the wheel slices and Songs list stay completely intact while spinning and until Continue is clicked!
    const pendingWinners = wheelState.winnerHistory.filter(
      (w: WheelWinnerRecord) => !w.revealedAt && (!w.revealAt || Date.parse(w.revealAt) > nowMs)
    );

    let visibleEntries = wheelState.entries;
    if (pendingWinners.length > 0) {
      const currentEntryIds = new Set(wheelState.entries.map((e) => e.id));
      const missingPending: WheelEntry[] = pendingWinners
        .filter((w) => !currentEntryIds.has(w.entryId))
        .map((w) => ({
          id: w.entryId,
          participantId: w.participantId,
          songTitle: w.songTitle,
          artist: w.artist,
          slotNumber: w.slotNumber,
          excluded: false,
          source: 'participant',
          createdAt: w.wonAt,
        }));
      if (missingPending.length > 0) {
        visibleEntries = [...wheelState.entries, ...missingPending];
        visibleEntries.sort((a, b) => (a.slotNumber ?? 999) - (b.slotNumber ?? 999));
      }
    }

    const currentSpin =
      wheelState.currentSpin &&
      nowMs - Date.parse(wheelState.currentSpin.spunAt) < wheelState.currentSpin.durationMs + 2000
        ? wheelState.currentSpin
        : undefined;

    const viewState: WheelViewState = {
      groupId: group.groupId,
      groupName: group.groupName,
      category: group.category,
      enabled: group.settings?.enableWheel ?? true,
      isOrganizer,
      entries: visibleEntries,
      winnerHistory: visibleHistory,
      currentSpin,
      totalActiveCount: visibleEntries.filter((e: WheelEntry) => !e.excluded).length,
      totalExcludedCount: visibleEntries.filter((e: WheelEntry) => e.excluded).length,
      totalWinnersCount: visibleHistory.length,
    };
    return jsonResponse(viewState);
  }

  if (req.method === 'POST') {
    if (!isOrganizer) {
      return errorResponse('Organizer authorization is required to modify or spin the wheel.', 403);
    }

    const parsed = await parseJsonBody(req);
    if (!parsed.ok) {
      return errorResponse('Invalid JSON payload in request body.', 400);
    }

    const body = (parsed.data || {}) as Record<string, unknown>;
    const action = subAction || (typeof body.action === 'string' ? body.action : '');

    // 1. SPIN ACTION
    if (action === 'spin') {
      const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : '';
      if (!entryId) {
        return errorResponse('Missing winning entry ID.', 400);
      }

      const entryIndex = wheelState.entries.findIndex((e: WheelEntry) => e.id === entryId);
      if (entryIndex === -1) {
        return errorResponse('Selected entry is not found on the active wheel.', 404);
      }

      const winningEntry = wheelState.entries[entryIndex];
      if (winningEntry.excluded) {
        return errorResponse('Selected entry is excluded from the active wheel.', 400);
      }

      // Fetch wishlist summary for winner modal if participant source
      let wishlistSummary: Array<{ name: string; estimatedPrice?: number }> | undefined;
      if (winningEntry.source === 'participant') {
        const sub = await storage.getJSON<SubmissionRecord>(keys.submission(groupId, winningEntry.participantId));
        if (sub?.wishlist && sub.wishlist.length > 0) {
          wishlistSummary = sub.wishlist.map((w) => ({
            name: w.name,
            estimatedPrice: w.estimatedPrice,
          }));
        }
      }

      const now = Date.now();
      const winner: WheelWinnerRecord = {
        winnerId: `win_${now}_${Math.random().toString(36).slice(2, 7)}`,
        entryId: winningEntry.id,
        participantId: winningEntry.participantId,
        order: wheelState.winnerHistory.length + 1,
        songTitle: winningEntry.songTitle,
        artist: winningEntry.artist,
        slotNumber: winningEntry.slotNumber,
        wonAt: new Date(now).toISOString(),
        revealAt: new Date(now + 180000).toISOString(),
        wishlistSummary,
      };

      // Append to winnerHistory (unrevealed until organizer clicks Continue in modal)
      wheelState.winnerHistory.push(winner);
      // Remove winning entry from stored entries
      wheelState.entries.splice(entryIndex, 1);
      wheelState.currentSpin = {
        entryId: winningEntry.id,
        spunAt: new Date(now).toISOString(),
        durationMs: 5000,
      };
      wheelState.updatedAt = new Date().toISOString();

      await storage.setJSON(keys.wheel(groupId), wheelState);

      const currentlyRevealedHistory = wheelState.winnerHistory.filter((w: WheelWinnerRecord) => !!w.revealedAt);

      return jsonResponse({
        success: true,
        winner,
        remainingCount: wheelState.entries.filter((e: WheelEntry) => !e.excluded).length,
        entries: wheelState.entries,
        winnerHistory: currentlyRevealedHistory,
      });
    }

    // 2. REVEAL / CONFIRM ACTION
    // Called when the organizer clicks "Continue" in the Winner Announcement Modal
    if (action === 'reveal' || action === 'confirm') {
      const winnerId = typeof body.winnerId === 'string' ? body.winnerId : undefined;
      const targetWinner = winnerId
        ? wheelState.winnerHistory.find((w: WheelWinnerRecord) => w.winnerId === winnerId)
        : wheelState.winnerHistory.slice().reverse().find((w: WheelWinnerRecord) => !w.revealedAt);

      if (targetWinner) {
        targetWinner.revealedAt = new Date().toISOString();
        delete targetWinner.revealAt;

        // Ensure winning entry is excluded from active entries
        wheelState.entries = wheelState.entries.filter((e: WheelEntry) => e.id !== targetWinner.entryId);
        wheelState.currentSpin = undefined;
        wheelState.updatedAt = new Date().toISOString();
        await storage.setJSON(keys.wheel(groupId), wheelState);
      }

      const revealedHistory = wheelState.winnerHistory.filter((w: WheelWinnerRecord) => !!w.revealedAt);

      return jsonResponse({
        success: true,
        entries: wheelState.entries,
        winnerHistory: revealedHistory,
        totalActiveCount: wheelState.entries.filter((e: WheelEntry) => !e.excluded).length,
        totalWinnersCount: revealedHistory.length,
      });
    }

    // 2. ENTRY MANAGEMENT (add, edit, remove, toggle_exclude)
    if (action === 'entries' || action === 'add' || action === 'edit' || action === 'remove' || action === 'toggle_exclude') {
      const subOp = action === 'entries' ? String(body.subOp || body.operation || '') : action;

      if (subOp === 'add') {
        const songTitle = typeof body.songTitle === 'string' ? body.songTitle.trim() : '';
        const artist = typeof body.artist === 'string' ? body.artist.trim() : undefined;

        if (!songTitle) {
          return errorResponse('Song title is required.', 400);
        }

        const newEntry: WheelEntry = {
          id: `entry_manual_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          participantId: `manual_${Date.now()}`,
          songTitle,
          artist,
          excluded: false,
          source: 'manual',
          createdAt: new Date().toISOString(),
        };

        wheelState.entries.push(newEntry);
        wheelState.updatedAt = new Date().toISOString();
        await storage.setJSON(keys.wheel(groupId), wheelState);

        return jsonResponse({
          success: true,
          entry: newEntry,
          entries: wheelState.entries,
        });
      }

      if (subOp === 'edit') {
        const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : '';
        const songTitle = typeof body.songTitle === 'string' ? body.songTitle.trim() : undefined;
        const artist = typeof body.artist === 'string' ? body.artist.trim() : undefined;

        const target = wheelState.entries.find((e: WheelEntry) => e.id === entryId);
        if (!target) {
          return errorResponse('Entry not found.', 404);
        }

        if (songTitle) target.songTitle = songTitle;
        if (artist !== undefined) target.artist = artist || undefined;

        wheelState.updatedAt = new Date().toISOString();
        await storage.setJSON(keys.wheel(groupId), wheelState);

        return jsonResponse({
          success: true,
          entry: target,
          entries: wheelState.entries,
        });
      }

      if (subOp === 'toggle_exclude') {
        const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : '';
        const target = wheelState.entries.find((e: WheelEntry) => e.id === entryId);
        if (!target) {
          return errorResponse('Entry not found.', 404);
        }

        target.excluded = !target.excluded;
        wheelState.updatedAt = new Date().toISOString();
        await storage.setJSON(keys.wheel(groupId), wheelState);

        return jsonResponse({
          success: true,
          entry: target,
          entries: wheelState.entries,
        });
      }

      if (subOp === 'remove') {
        const entryId = typeof body.entryId === 'string' ? body.entryId.trim() : '';
        const beforeLen = wheelState.entries.length;
        wheelState.entries = wheelState.entries.filter((e: WheelEntry) => e.id !== entryId);

        if (wheelState.entries.length === beforeLen) {
          return errorResponse('Entry not found on active wheel.', 404);
        }

        wheelState.updatedAt = new Date().toISOString();
        await storage.setJSON(keys.wheel(groupId), wheelState);

        return jsonResponse({
          success: true,
          entries: wheelState.entries,
        });
      }

      return errorResponse('Unknown entry management operation.', 400);
    }

    // 3. RESET ACTION (Reset active wheel for another round, STRICTLY PRESERVING winner history)
    if (action === 'reset') {
      const repopulated: WheelEntry[] = [];

      for (let i = 0; i < group.participantIds.length; i++) {
        const pid = group.participantIds[i];
        const sub = await storage.getJSON<SubmissionRecord>(keys.submission(groupId, pid));
        repopulated.push({
          id: `entry_${pid}`,
          participantId: pid,
          songTitle:
            sub?.songTitle || group.participantSummaries?.[pid]?.songTitle || `Participant #${i + 1}`,
          artist: sub?.artist || group.participantSummaries?.[pid]?.artist,
          slotNumber: i + 1,
          excluded: false,
          source: 'participant',
          createdAt: sub?.createdAt || new Date().toISOString(),
        });
      }

      // Also carry forward any manual entries that exist, resetting excluded to false
      const manualEntries = wheelState.entries
        .filter((e: WheelEntry) => e.source === 'manual')
        .map((e: WheelEntry) => ({ ...e, excluded: false }));

      wheelState.entries = [...repopulated, ...manualEntries];
      wheelState.winnerHistory = [];
      wheelState.currentSpin = undefined;
      wheelState.updatedAt = new Date().toISOString();

      await storage.setJSON(keys.wheel(groupId), wheelState);

      return jsonResponse({
        success: true,
        message: 'Wheel and winner history reset for a new round.',
        entries: wheelState.entries,
        winnerHistory: wheelState.winnerHistory,
      });
    }

    return errorResponse('Invalid wheel action.', 400);
  }

  return errorResponse('Method not allowed.', 405);
}

export default async (req: Request, context: Context) => {
  const groupId = (context.params?.groupId as string) || '';
  const action = (context.params?.action as string) || '';
  return handleWheel(req, groupId, action);
};

export const config: Config = {
  path: '/api/wheel/:groupId/:action?',
  method: ['GET', 'POST'],
};
