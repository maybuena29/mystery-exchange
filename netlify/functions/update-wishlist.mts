import type { Config } from '@netlify/functions';
import { hashToken } from './lib/crypto';
import { errorResponse, extractBearerToken, jsonResponse, parseJsonBody } from './lib/http';
import {
  getStorage,
  keys,
  type GroupRecord,
  type ParticipantTokenIndex,
  type SubmissionRecord,
} from './lib/store';
import { validatePreferences, validateWishlistItems } from './lib/validation';
import { canParticipantEditWishlist } from './participant-session.mts';

export async function handleUpdateWishlist(req: Request): Promise<Response> {
  if (req.method !== 'PUT') {
    return errorResponse('Method not allowed.', 405);
  }

  const token = extractBearerToken(req);
  if (!token) {
    return errorResponse('Private participant token is required.', 401);
  }

  const parsed = await parseJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const storage = getStorage();
  const tokenHash = hashToken(token);
  const index = await storage.getJSON<ParticipantTokenIndex>(keys.participantToken(tokenHash));
  if (!index) {
    return errorResponse('Invalid private access link.', 404);
  }

  const groupEntry = await storage.getJSONWithEtag<GroupRecord>(keys.group(index.groupId));
  const submission = await storage.getJSON<SubmissionRecord>(
    keys.submission(index.groupId, index.participantId)
  );

  if (!groupEntry || !submission) {
    return errorResponse('Participant submission not found.', 404);
  }

  const group = groupEntry.data;
  if (!canParticipantEditWishlist(group)) {
    return errorResponse('Wishlist editing is currently disabled for this exchange.', 403);
  }

  const wishlistRes = validateWishlistItems(parsed.data.wishlist, group.settings.maxWishlistItems);
  if (!wishlistRes.valid || !wishlistRes.items) {
    return errorResponse(wishlistRes.error ?? 'Invalid wishlist.', 400);
  }

  // If draw has started, items from the original draw cannot be deleted; participants can only edit them or add new items.
  // Newly added items can be deleted.
  let lockedWishlistItemIds = submission.lockedWishlistItemIds;
  if (group.status === 'DRAWN' || group.status === 'COMPLETED') {
    if (!lockedWishlistItemIds) {
      lockedWishlistItemIds = submission.wishlist.map((item) => item.id);
    }
    const incomingIds = new Set(wishlistRes.items.map((item) => item.id));
    const missingLocked = lockedWishlistItemIds.filter((id) => !incomingIds.has(id));
    if (missingLocked.length > 0) {
      return errorResponse(
        'Wishlist items that existed before the draw cannot be deleted. You can edit them or add new items.',
        400
      );
    }
  }

  const preferences =
    parsed.data.preferences !== undefined
      ? validatePreferences(parsed.data.preferences)
      : submission.preferences;

  const now = new Date().toISOString();
  const wishlistCompleted = wishlistRes.items.length > 0;

  // Note: songTitle and artist remain locked and are never overwritten here.
  const updatedSubmission: SubmissionRecord = {
    ...submission,
    wishlist: wishlistRes.items,
    preferences,
    wishlistCompleted,
    lockedWishlistItemIds: lockedWishlistItemIds ?? submission.lockedWishlistItemIds,
    updatedAt: now,
  };

  await storage.setJSON(keys.submission(index.groupId, index.participantId), updatedSubmission);

  // Sync wishlistCompleted flag to group summary with CAS retry
  if (
    group.participantSummaries[index.participantId]?.wishlistCompleted !== wishlistCompleted
  ) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const latest = await storage.getJSONWithEtag<GroupRecord>(keys.group(index.groupId));
      if (!latest) break;
      const g = latest.data;
      if (!g.participantSummaries[index.participantId]) break;

      const updatedGroup: GroupRecord = {
        ...g,
        participantSummaries: {
          ...g.participantSummaries,
          [index.participantId]: {
            ...g.participantSummaries[index.participantId],
            wishlistCompleted,
          },
        },
        updatedAt: now,
      };
      const res = await storage.setJSON(keys.group(index.groupId), updatedGroup, {
        onlyIfMatch: latest.etag,
      });
      if (res.modified) break;
    }
  }

  return jsonResponse({
    wishlist: updatedSubmission.wishlist,
    preferences: updatedSubmission.preferences,
    wishlistCompleted: updatedSubmission.wishlistCompleted,
    lockedWishlistItemIds: updatedSubmission.lockedWishlistItemIds,
  });
}

export default async (req: Request) => {
  return handleUpdateWishlist(req);
};

export const config: Config = {
  path: '/api/participant/wishlist',
  method: ['PUT'],
};
