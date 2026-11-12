import type { Config } from '@netlify/functions';
import { hashToken } from './lib/crypto';
import { errorResponse, extractBearerToken, jsonResponse, parseJsonBody } from './lib/http';
import {
  getStorage,
  keys,
  type GiftProgressRecord,
  type GroupRecord,
  type ParticipantTokenIndex,
} from './lib/store';
import { cleanText } from './lib/validation';
import type { GiftChecklist } from '../../src/types/exchange';

export async function handleUpdateGiftProgress(req: Request): Promise<Response> {
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

  const group = await storage.getJSON<GroupRecord>(keys.group(index.groupId));
  if (!group) {
    return errorResponse('Exchange group not found.', 404);
  }

  if (group.status !== 'DRAWN' && group.status !== 'COMPLETED') {
    return errorResponse('Gift preparation checklist is available after the draw.', 409);
  }

  const rawChecklist = (parsed.data.checklist && typeof parsed.data.checklist === 'object'
    ? parsed.data.checklist
    : {}) as Record<string, unknown>;

  const checklist: GiftChecklist = {
    reviewedWishlist: Boolean(rawChecklist.reviewedWishlist),
    choseGift: Boolean(rawChecklist.choseGift),
    purchasedGift: Boolean(rawChecklist.purchasedGift),
    wrappedGift: Boolean(rawChecklist.wrappedGift),
    readyToBring: Boolean(rawChecklist.readyToBring),
  };

  const privateNotes = cleanText(parsed.data.privateNotes, 2000);
  const now = new Date().toISOString();

  const record: GiftProgressRecord = {
    groupId: index.groupId,
    giverParticipantId: index.participantId,
    checklist,
    privateNotes,
    updatedAt: now,
  };

  await storage.setJSON(keys.giftProgress(index.groupId, index.participantId), record);

  return jsonResponse({
    giftProgress: {
      checklist: record.checklist,
      privateNotes: record.privateNotes,
      updatedAt: record.updatedAt,
    },
  });
}

export default async (req: Request) => {
  return handleUpdateGiftProgress(req);
};

export const config: Config = {
  path: '/api/participant/gift-progress',
  method: ['PUT'],
};
