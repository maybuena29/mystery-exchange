import type { Config, Context } from '@netlify/functions';
import { generateSecretToken, hashToken, timingSafeEqualHex } from './lib/crypto';
import { errorResponse, extractBearerToken, jsonResponse, parseJsonBody } from './lib/http';
import {
  getStorage,
  keys,
  toOrganizerGroupView,
  type GroupRecord,
  type ParticipantTokenIndex,
  type RecoveryRecord,
  type SubmissionRecord,
} from './lib/store';
import { cleanText, validateBudget, validateGroupSettings } from './lib/validation';
import type { EventCategory } from '../../src/types/exchange';

const VALID_CATEGORIES = new Set<EventCategory>([
  'Christmas',
  'Birthday',
  'Office Exchange',
  'Family Exchange',
  'Friends Exchange',
  'Custom',
]);

async function authorizeOrganizer(
  groupId: string,
  req: Request
): Promise<{ ok: true; group: GroupRecord; etag: string } | { ok: false; response: Response }> {
  const token = extractBearerToken(req);
  if (!token) {
    return { ok: false, response: errorResponse('Organizer authorization token is required.', 401) };
  }

  const storage = getStorage();
  const entry = await storage.getJSONWithEtag<GroupRecord>(keys.group(groupId));
  if (!entry) {
    return { ok: false, response: errorResponse('Exchange group not found.', 404) };
  }

  const incomingHash = hashToken(token);
  if (!timingSafeEqualHex(incomingHash, entry.data.organizerTokenHash)) {
    return { ok: false, response: errorResponse('Invalid organizer authorization token.', 403) };
  }

  return { ok: true, group: entry.data, etag: entry.etag };
}

export async function handleOrganizerGroup(req: Request, groupId: string): Promise<Response> {
  if (!groupId || groupId.length > 64) {
    return errorResponse('Invalid group ID.', 400);
  }

  const auth = await authorizeOrganizer(groupId, req);
  if (!auth.ok) {
    return auth.response;
  }

  const { group, etag } = auth;

  if (req.method === 'GET') {
    // Backfill songTitle/artist for any legacy participantSummaries safely
    let hydratedGroup = group;
    try {
      const summaries = group.participantSummaries || {};
      const missingPids = (group.participantIds || []).filter(
        (pid) => !summaries[pid]?.songTitle
      );
      if (missingPids.length > 0) {
        const subs = await Promise.all(
          missingPids.map(async (pid) => {
            try {
              return await storage.getJSON<SubmissionRecord>(keys.submission(groupId, pid));
            } catch {
              return null;
            }
          })
        );
        const updatedSummaries = { ...summaries };
        missingPids.forEach((pid, idx) => {
          const sub = subs[idx];
          const existing = updatedSummaries[pid] || { joinedAt: group.createdAt, wishlistCompleted: false };
          updatedSummaries[pid] = {
            ...existing,
            songTitle: sub?.songTitle || `Participant #${idx + 1}`,
            artist: sub?.artist,
          };
        });
        hydratedGroup = { ...group, participantSummaries: updatedSummaries };
      }
    } catch {
      // Fall back to original group without failing the request
    }
    return jsonResponse({ group: toOrganizerGroupView(hydratedGroup) });
  }

  if (req.method !== 'PATCH') {
    return errorResponse('Method not allowed.', 405);
  }

  const parsed = await parseJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const action = parsed.data.action;
  const storage = getStorage();
  const now = new Date().toISOString();

  if (action === 'update_details') {
    if (group.status === 'DRAWN' || group.status === 'LOCKED' || group.status === 'COMPLETED' || group.status === 'CANCELLED') {
      return errorResponse('Group details cannot be edited after the draw has started or event is closed.', 409);
    }

    const updated: GroupRecord = { ...group, updatedAt: now };

    if (parsed.data.groupName !== undefined) {
      const name = cleanText(parsed.data.groupName, 100);
      if (name.length < 2) {
        return errorResponse('Group name must be at least 2 characters.', 400);
      }
      updated.groupName = name;
    }

    if (parsed.data.description !== undefined) {
      updated.description = cleanText(parsed.data.description, 500) || undefined;
    }

    if (parsed.data.category !== undefined) {
      const cat = String(parsed.data.category) as EventCategory;
      if (VALID_CATEGORIES.has(cat)) {
        updated.category = cat;
      }
    }

    if (parsed.data.eventDate !== undefined) {
      updated.eventDate = cleanText(parsed.data.eventDate, 32) || undefined;
    }

    if (parsed.data.registrationDeadline !== undefined) {
      updated.registrationDeadline = cleanText(parsed.data.registrationDeadline, 32) || undefined;
    }

    if (parsed.data.instructions !== undefined) {
      updated.instructions = cleanText(parsed.data.instructions, 1000) || undefined;
    }

    if (parsed.data.budget !== undefined) {
      const bRes = validateBudget(parsed.data.budget);
      if (!bRes.valid || !bRes.budget) {
        return errorResponse(bRes.error ?? 'Invalid budget.', 400);
      }
      updated.budget = bRes.budget;
    }

    if (parsed.data.settings !== undefined) {
      const sRes = validateGroupSettings(parsed.data.settings);
      if (!sRes.valid || !sRes.settings) {
        return errorResponse(sRes.error ?? 'Invalid settings.', 400);
      }
      if (sRes.settings.maxParticipants < group.participantIds.length) {
        return errorResponse(
          `Participant limit cannot be lower than current participant count (${group.participantIds.length}).`,
          400
        );
      }
      updated.settings = sRes.settings;
    }

    const res = await storage.setJSON(keys.group(groupId), updated, { onlyIfMatch: etag });
    if (!res.modified) {
      return errorResponse('Group was modified concurrently. Please refresh and try again.', 409);
    }
    return jsonResponse({ group: toOrganizerGroupView(updated) });
  }

  if (action === 'close_registration') {
    if (group.status !== 'CREATED' && group.status !== 'COLLECTING') {
      return errorResponse('Registration can only be closed while collecting participants.', 409);
    }
    const count = group.participantIds.length;
    const completedCount = Object.values(group.participantSummaries).filter((s) => s.wishlistCompleted).length;
    const isReady =
      count >= 3 && (!group.settings.requireCompletedWishlist || completedCount === count);

    const updated: GroupRecord = {
      ...group,
      status: isReady ? 'READY' : 'REGISTRATION_CLOSED',
      updatedAt: now,
    };
    const res = await storage.setJSON(keys.group(groupId), updated, { onlyIfMatch: etag });
    if (!res.modified) {
      return errorResponse('Concurrent update detected. Please retry.', 409);
    }
    return jsonResponse({ group: toOrganizerGroupView(updated) });
  }

  if (action === 'reopen_registration') {
    if (group.status !== 'REGISTRATION_CLOSED' && group.status !== 'READY') {
      return errorResponse('Registration can only be reopened before the draw starts.', 409);
    }
    const updated: GroupRecord = {
      ...group,
      status: group.participantIds.length > 0 ? 'COLLECTING' : 'CREATED',
      updatedAt: now,
    };
    const res = await storage.setJSON(keys.group(groupId), updated, { onlyIfMatch: etag });
    if (!res.modified) {
      return errorResponse('Concurrent update detected. Please retry.', 409);
    }
    return jsonResponse({ group: toOrganizerGroupView(updated) });
  }

  if (action === 'regenerate_participant_link') {
    const slotId = typeof parsed.data.slotId === 'string' ? parsed.data.slotId.trim() : '';
    if (!slotId || !group.participantIds.includes(slotId)) {
      return errorResponse('Participant slot not found in this group.', 404);
    }

    const submission = await storage.getJSON<SubmissionRecord>(keys.submission(groupId, slotId));
    if (!submission) {
      return errorResponse('Participant submission not found.', 404);
    }

    const newPrivateToken = generateSecretToken('prt');
    const newTokenHash = hashToken(newPrivateToken);
    const tokenIndex: ParticipantTokenIndex = {
      groupId,
      participantId: slotId,
      createdAt: now,
    };

    const ops: Promise<unknown>[] = [
      storage.setJSON(keys.participantToken(newTokenHash), tokenIndex, { onlyIfNew: true }),
      storage.setJSON(keys.submission(groupId, slotId), {
        ...submission,
        tokenHash: newTokenHash,
      }),
    ];

    if (submission.tokenHash) {
      ops.push(storage.delete(keys.participantToken(submission.tokenHash)));
    }
    if (submission.songHash) {
      const rec = await storage.getJSON<RecoveryRecord>(keys.recovery(groupId, submission.songHash));
      if (rec) {
        ops.push(
          storage.setJSON(keys.recovery(groupId, submission.songHash), {
            ...rec,
            tokenHash: newTokenHash,
          })
        );
      }
    }

    await Promise.all(ops);

    return jsonResponse({
      privateToken: newPrivateToken,
      isDrawn: group.status === 'DRAWN' || group.status === 'COMPLETED',
      songTitle: submission.songTitle,
      artist: submission.artist,
    });
  }

  if (action === 'remove_participant') {
    if (group.status === 'DRAWN' || group.status === 'LOCKED' || group.status === 'COMPLETED' || group.status === 'CANCELLED') {
      return errorResponse('Participants cannot be removed after the draw has started or event is closed.', 409);
    }

    const slotId = typeof parsed.data.slotId === 'string' ? parsed.data.slotId.trim() : '';
    if (!slotId || !group.participantIds.includes(slotId)) {
      return errorResponse('Participant slot not found in this group.', 404);
    }

    const submission = await storage.getJSON<SubmissionRecord>(keys.submission(groupId, slotId));
    const cleanups: Promise<void>[] = [storage.delete(keys.submission(groupId, slotId))];
    if (submission?.tokenHash) {
      cleanups.push(storage.delete(keys.participantToken(submission.tokenHash)));
    }
    if (submission?.songHash) {
      cleanups.push(storage.delete(keys.recovery(groupId, submission.songHash)));
    }
    await Promise.all(cleanups);

    const remainingIds = group.participantIds.filter((id) => id !== slotId);
    const remainingSummaries = { ...group.participantSummaries };
    delete remainingSummaries[slotId];

    const updated: GroupRecord = {
      ...group,
      status: remainingIds.length === 0 ? 'CREATED' : group.status,
      participantIds: remainingIds,
      participantSummaries: remainingSummaries,
      updatedAt: now,
    };

    const res = await storage.setJSON(keys.group(groupId), updated, { onlyIfMatch: etag });
    if (!res.modified) {
      return errorResponse('Concurrent update detected. Please retry.', 409);
    }
    return jsonResponse({ group: toOrganizerGroupView(updated) });
  }

  if (action === 'reset_group') {
    if (group.status === 'DRAWN' || group.status === 'LOCKED' || group.status === 'COMPLETED') {
      return errorResponse('Cannot reset a group after the draw has been finalized.', 409);
    }
    // Delete all participant submissions
    await Promise.all(
      group.participantIds.map((pid) => storage.delete(keys.submission(groupId, pid)))
    );

    const updated: GroupRecord = {
      ...group,
      status: 'CREATED',
      participantIds: [],
      participantSummaries: {},
      updatedAt: now,
    };
    const res = await storage.setJSON(keys.group(groupId), updated, { onlyIfMatch: etag });
    if (!res.modified) {
      return errorResponse('Concurrent update detected. Please retry.', 409);
    }
    return jsonResponse({ group: toOrganizerGroupView(updated) });
  }

  if (action === 'cancel_event') {
    if (group.status === 'DRAWN' || group.status === 'LOCKED' || group.status === 'COMPLETED') {
      return errorResponse('Cannot cancel an exchange after the draw has been completed.', 409);
    }
    const updated: GroupRecord = {
      ...group,
      status: 'CANCELLED',
      updatedAt: now,
    };
    const res = await storage.setJSON(keys.group(groupId), updated, { onlyIfMatch: etag });
    if (!res.modified) {
      return errorResponse('Concurrent update detected. Please retry.', 409);
    }
    return jsonResponse({ group: toOrganizerGroupView(updated) });
  }

  if (action === 'complete_event') {
    if (group.status !== 'DRAWN') {
      return errorResponse('Only a drawn exchange can be marked as completed.', 409);
    }
    const updated: GroupRecord = {
      ...group,
      status: 'COMPLETED',
      updatedAt: now,
    };
    const res = await storage.setJSON(keys.group(groupId), updated, { onlyIfMatch: etag });
    if (!res.modified) {
      return errorResponse('Concurrent update detected. Please retry.', 409);
    }
    return jsonResponse({ group: toOrganizerGroupView(updated) });
  }

  return errorResponse('Unknown organizer action.', 400);
}

export default async (req: Request, context: Context) => {
  return handleOrganizerGroup(req, context.params.groupId ?? '');
};

export const config: Config = {
  path: '/api/organizer/:groupId',
  method: ['GET', 'PATCH'],
};
