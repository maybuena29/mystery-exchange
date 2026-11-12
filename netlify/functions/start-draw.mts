import type { Config } from '@netlify/functions';
import { hashToken, timingSafeEqualHex } from './lib/crypto';
import { generateDerangement, verifyDerangement } from './lib/derangement';
import { errorResponse, extractBearerToken, jsonResponse, parseJsonBody } from './lib/http';
import {
  computeDrawReadiness,
  getStorage,
  keys,
  toOrganizerGroupView,
  type AssignmentRecord,
  type GroupRecord,
  type SubmissionRecord,
} from './lib/store';

export async function handleStartDraw(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  const token = extractBearerToken(req);
  if (!token) {
    return errorResponse('Organizer authorization token is required.', 401);
  }

  const parsed = await parseJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok || typeof parsed.data.groupId !== 'string' || !parsed.data.groupId.trim()) {
    return errorResponse('Group ID is required.', 400);
  }

  const groupId = parsed.data.groupId.trim();
  const storage = getStorage();

  const initialEntry = await storage.getJSONWithEtag<GroupRecord>(keys.group(groupId));
  if (!initialEntry) {
    return errorResponse('Exchange group not found.', 404);
  }

  const incomingHash = hashToken(token);
  if (!timingSafeEqualHex(incomingHash, initialEntry.data.organizerTokenHash)) {
    return errorResponse('Invalid organizer authorization token.', 403);
  }

  if (initialEntry.data.status === 'DRAWN' || initialEntry.data.status === 'COMPLETED') {
    return errorResponse('This exchange has already been drawn and cannot be run again.', 409);
  }

  // Acquire exclusive draw lock
  const lockKey = keys.drawLock(groupId);
  const lockRes = await storage.setJSON(
    lockKey,
    { groupId, lockedAt: new Date().toISOString() },
    { onlyIfNew: true }
  );
  if (!lockRes.modified) {
    return errorResponse('A draw is already in progress or has been finalized for this group.', 409);
  }

  try {
    const entry = await storage.getJSONWithEtag<GroupRecord>(keys.group(groupId));
    if (!entry) {
      return errorResponse('Exchange group not found.', 404);
    }

    const group = entry.data;
    const readiness = computeDrawReadiness(group);
    if (!readiness.isReady) {
      return errorResponse(readiness.reasons[0] ?? 'Group is not ready for the draw.', 409);
    }

    const participantIds = group.participantIds;
    if (participantIds.length < 3 || participantIds.length > group.settings.maxParticipants) {
      return errorResponse('Invalid participant count for draw.', 409);
    }

    // Verify all submission records exist before locking/publishing
    const submissions = await Promise.all(
      participantIds.map((pid) => storage.getJSON<SubmissionRecord>(keys.submission(groupId, pid)))
    );
    if (submissions.some((s) => s === null)) {
      return errorResponse('Some participant submissions are missing. Draw aborted without publishing.', 500);
    }

    if (group.settings.requireCompletedWishlist) {
      const incomplete = submissions.some((s) => !s || !s.wishlistCompleted);
      if (incomplete) {
        return errorResponse('All participants must complete a wishlist before the draw.', 409);
      }
    }

    // Transition group to LOCKED atomically before writing assignments
    const lockedGroup: GroupRecord = {
      ...group,
      status: 'LOCKED',
      updatedAt: new Date().toISOString(),
    };
    const lockCas = await storage.setJSON(keys.group(groupId), lockedGroup, {
      onlyIfMatch: entry.etag,
    });
    if (!lockCas.modified || !lockCas.etag) {
      return errorResponse('Group was modified concurrently. Draw aborted.', 409);
    }

    // Generate and verify CSPRNG derangement
    const recipients = generateDerangement(participantIds);
    if (!verifyDerangement(participantIds, recipients)) {
      // Revert to previous status if invariant check ever failed
      await storage.setJSON(keys.group(groupId), group, { onlyIfMatch: lockCas.etag });
      return errorResponse('Assignment verification failed. No results were published.', 500);
    }

    const finalizedAt = new Date().toISOString();
    await Promise.all(
      participantIds.map((giverId, idx) => {
        const assignment: AssignmentRecord = {
          groupId,
          giverParticipantId: giverId,
          recipientParticipantId: recipients[idx],
          finalizedAt,
        };
        return storage.setJSON(keys.assignment(groupId, giverId), assignment, {
          onlyIfNew: true,
        });
      })
    );

    const drawnGroup: GroupRecord = {
      ...lockedGroup,
      status: 'DRAWN',
      drawnAt: finalizedAt,
      updatedAt: finalizedAt,
    };
    await storage.setJSON(keys.group(groupId), drawnGroup, { onlyIfMatch: lockCas.etag });

    // Return ONLY aggregate organizer view — never the assignment mapping
    return jsonResponse({ group: toOrganizerGroupView(drawnGroup) });
  } finally {
    // Release lock only if group was NOT drawn
    const current = await storage.getJSON<GroupRecord>(keys.group(groupId));
    if (current && current.status !== 'DRAWN' && current.status !== 'COMPLETED') {
      await storage.delete(lockKey);
    }
  }
}

export default async (req: Request) => {
  return handleStartDraw(req);
};

export const config: Config = {
  path: '/api/start-draw',
  method: ['POST'],
};
