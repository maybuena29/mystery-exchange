import type { Config, Context } from '@netlify/functions';
import { generateSecretToken, generateUrlSafeId, hashToken } from './lib/crypto';
import { checkRateLimit, errorResponse, jsonResponse, parseJsonBody } from './lib/http';
import {
  getStorage,
  isRegistrationOpen,
  keys,
  toPublicGroupInfo,
  type GroupRecord,
  type ParticipantTokenIndex,
  type RecoveryRecord,
  type SubmissionRecord,
} from './lib/store';
import { cleanText, validatePreferences, validateWishlistItems } from './lib/validation';
import type { ParticipantSessionView } from '../../src/types/exchange';

export async function handleJoinGroup(req: Request, clientIp = 'unknown'): Promise<Response> {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  if (!checkRateLimit(`join:${clientIp}`, 30, 60_000)) {
    return errorResponse('Too many join attempts. Please wait a moment and try again.', 429);
  }

  const parsed = await parseJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const groupId = cleanText(parsed.data.groupId, 64);
  const songTitle = cleanText(parsed.data.songTitle, 140);
  const artist = cleanText(parsed.data.artist, 120) || undefined;
  const recoveryPhrase = cleanText(parsed.data.recoveryPhrase, 120);

  if (!groupId) {
    return errorResponse('Group ID is required.', 400);
  }
  if (songTitle.length < 1) {
    return errorResponse('Please enter a song title as your anonymous identity.', 400);
  }
  if (recoveryPhrase && recoveryPhrase.length < 4) {
    return errorResponse('Secret recovery phrase must be at least 4 characters.', 400);
  }

  const songHash = hashToken(`${groupId}:${songTitle.toLowerCase()}`);

  const storage = getStorage();

  // Retry CAS loop on group record to handle concurrent joins safely
  for (let attempt = 0; attempt < 5; attempt++) {
    const entry = await storage.getJSONWithEtag<GroupRecord>(keys.group(groupId));
    if (!entry) {
      return errorResponse('Exchange group not found.', 404);
    }

    const group = entry.data;
    if (!isRegistrationOpen(group)) {
      if (group.participantIds.length >= group.settings.maxParticipants) {
        return errorResponse('This exchange has reached its maximum participant limit.', 409);
      }
      return errorResponse('Registration for this exchange is currently closed.', 409);
    }

    const wishlistRes = validateWishlistItems(parsed.data.wishlist, group.settings.maxWishlistItems);
    if (!wishlistRes.valid || !wishlistRes.items) {
      return errorResponse(wishlistRes.error ?? 'Invalid wishlist.', 400);
    }

    const preferences = validatePreferences(parsed.data.preferences);
    const participantId = generateUrlSafeId(8);
    const privateToken = generateSecretToken('prt');
    const tokenHash = hashToken(privateToken);
    const now = new Date().toISOString();
    const wishlistCompleted = wishlistRes.items.length > 0;

    const updatedGroup: GroupRecord = {
      ...group,
      status: 'COLLECTING',
      participantIds: [...group.participantIds, participantId],
      participantSummaries: {
        ...group.participantSummaries,
        [participantId]: {
          songTitle,
          artist,
          joinedAt: now,
          wishlistCompleted,
        },
      },
      updatedAt: now,
    };

    const casResult = await storage.setJSON(keys.group(groupId), updatedGroup, {
      onlyIfMatch: entry.etag,
    });
    if (!casResult.modified) {
      continue;
    }

    const tokenIndex: ParticipantTokenIndex = {
      groupId,
      participantId,
      createdAt: now,
    };
    const submission: SubmissionRecord = {
      groupId,
      participantId,
      songTitle,
      artist,
      wishlist: wishlistRes.items,
      preferences,
      wishlistCompleted,
      tokenHash,
      songHash: recoveryPhrase ? songHash : undefined,
      createdAt: now,
      updatedAt: now,
    };

    const writes: Promise<unknown>[] = [
      storage.setJSON(keys.participantToken(tokenHash), tokenIndex, { onlyIfNew: true }),
      storage.setJSON(keys.submission(groupId, participantId), submission, { onlyIfNew: true }),
    ];

    if (recoveryPhrase) {
      const recoveryRecord: RecoveryRecord = {
        groupId,
        participantId,
        recoveryHash: hashToken(`${groupId}:${recoveryPhrase}`),
        tokenHash,
        createdAt: now,
      };
      writes.push(
        storage.setJSON(keys.recovery(groupId, songHash), recoveryRecord, { onlyIfNew: true })
      );
    }

    await Promise.all(writes);

    const session: ParticipantSessionView = {
      group: toPublicGroupInfo(updatedGroup),
      songTitle: submission.songTitle,
      artist: submission.artist,
      wishlist: submission.wishlist,
      preferences: submission.preferences,
      wishlistCompleted: submission.wishlistCompleted,
      joinedAt: submission.createdAt,
      canEditWishlist: updatedGroup.settings.allowEditBeforeDraw,
    };

    return jsonResponse({ privateToken, session }, 201);
  }

  return errorResponse('Could not complete registration due to high concurrency. Please try again.', 409);
}

export default async (req: Request, context: Context) => {
  return handleJoinGroup(req, context.ip ?? 'unknown');
};

export const config: Config = {
  path: '/api/join-group',
  method: ['POST'],
};
