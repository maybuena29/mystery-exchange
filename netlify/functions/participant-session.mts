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
  type WheelStateRecord,
  type WheelWinnerRecord,
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

  const isPostDraw = group.status === 'DRAWN' || group.status === 'COMPLETED';
  const lockedWishlistItemIds = isPostDraw
    ? (submission.lockedWishlistItemIds ?? submission.wishlist.map((i) => i.id))
    : [];

  const session: ParticipantSessionView = {
    group: toPublicGroupInfo(group),
    songTitle: submission.songTitle,
    artist: submission.artist,
    wishlist: submission.wishlist,
    preferences: submission.preferences,
    wishlistCompleted: submission.wishlistCompleted,
    joinedAt: submission.createdAt,
    canEditWishlist: canParticipantEditWishlist(group),
    lockedWishlistItemIds,
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

  // Check if participant has won any Spin the Wheel / Wheel of Songs round
  const wheelState = await storage.getJSON<WheelStateRecord>(keys.wheel(index.groupId));
  if (wheelState?.winnerHistory && wheelState.winnerHistory.length > 0) {
    const nowMs = Date.now();
    const myWins = wheelState.winnerHistory
      .filter((w: WheelWinnerRecord) => w.participantId === index.participantId)
      .filter((w: WheelWinnerRecord) => !!w.revealedAt || (w.revealAt && Date.parse(w.revealAt) <= nowMs))
      .map((w: WheelWinnerRecord) => ({
        winnerId: w.winnerId,
        order: w.order,
        songTitle: w.songTitle,
        artist: w.artist,
        wonAt: w.wonAt,
      }));
    if (myWins.length > 0) {
      session.wheelWins = myWins;
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
