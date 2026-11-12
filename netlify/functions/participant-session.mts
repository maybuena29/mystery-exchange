import type { Config } from '@netlify/functions';
import { hashToken } from './lib/crypto';
import { errorResponse, extractBearerToken, jsonResponse } from './lib/http';
import {
  getStorage,
  keys,
  toPublicGroupInfo,
  type AssignmentRecord,
  type GiftProgressRecord,
  type GroupRecord,
  type ParticipantTokenIndex,
  type SubmissionRecord,
} from './lib/store';
import type { GiftProgress, ParticipantSessionView } from '../../src/types/exchange';

export const DEFAULT_GIFT_PROGRESS: GiftProgress = {
  checklist: {
    reviewedWishlist: false,
    choseGift: false,
    purchasedGift: false,
    wrappedGift: false,
    readyToBring: false,
  },
  privateNotes: '',
  updatedAt: '',
};

export function canParticipantEditWishlist(group: GroupRecord): boolean {
  if (group.status === 'CANCELLED' || group.status === 'LOCKED' || group.status === 'COMPLETED') {
    return false;
  }
  if (group.status === 'DRAWN') {
    return group.settings.allowEditAfterDraw;
  }
  return group.settings.allowEditBeforeDraw;
}

export async function handleParticipantSession(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return errorResponse('Method not allowed.', 405);
  }

  const token = extractBearerToken(req);
  if (!token) {
    return errorResponse('Private participant token is required.', 401);
  }

  const storage = getStorage();
  const tokenHash = hashToken(token);
  const index = await storage.getJSON<ParticipantTokenIndex>(keys.participantToken(tokenHash));
  if (!index) {
    return errorResponse('Invalid or expired private access link.', 404);
  }

  const [group, submission] = await Promise.all([
    storage.getJSON<GroupRecord>(keys.group(index.groupId)),
    storage.getJSON<SubmissionRecord>(keys.submission(index.groupId, index.participantId)),
  ]);

  if (!group || !submission) {
    return errorResponse('Participant record or exchange group no longer exists.', 404);
  }

  const session: ParticipantSessionView = {
    group: toPublicGroupInfo(group),
    songTitle: submission.songTitle,
    artist: submission.artist,
    wishlist: submission.wishlist,
    preferences: submission.preferences,
    wishlistCompleted: submission.wishlistCompleted,
    joinedAt: submission.createdAt,
    canEditWishlist: canParticipantEditWishlist(group),
  };

  if (group.status === 'DRAWN' || group.status === 'COMPLETED') {
    const assignment = await storage.getJSON<AssignmentRecord>(
      keys.assignment(group.groupId, index.participantId)
    );
    if (assignment) {
      const [recipientSub, progress] = await Promise.all([
        storage.getJSON<SubmissionRecord>(
          keys.submission(group.groupId, assignment.recipientParticipantId)
        ),
        storage.getJSON<GiftProgressRecord>(
          keys.giftProgress(group.groupId, index.participantId)
        ),
      ]);

      if (recipientSub) {
        session.assignment = {
          songTitle: recipientSub.songTitle,
          artist: recipientSub.artist,
          wishlist: recipientSub.wishlist,
          preferences: recipientSub.preferences,
          finalizedAt: assignment.finalizedAt,
        };
      }

      session.giftProgress = progress
        ? {
            checklist: progress.checklist,
            privateNotes: progress.privateNotes,
            updatedAt: progress.updatedAt,
          }
        : DEFAULT_GIFT_PROGRESS;
    }
  }

  return jsonResponse({ session });
}

export default async (req: Request) => {
  return handleParticipantSession(req);
};

export const config: Config = {
  path: '/api/participant/session',
  method: ['GET'],
};
