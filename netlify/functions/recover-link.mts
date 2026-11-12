import type { Config, Context } from '@netlify/functions';
import { generateSecretToken, hashToken, timingSafeEqualHex } from './lib/crypto';
import { checkRateLimit, errorResponse, jsonResponse, parseJsonBody } from './lib/http';
import {
  getStorage,
  keys,
  type GroupRecord,
  type ParticipantTokenIndex,
  type RecoveryRecord,
  type SubmissionRecord,
} from './lib/store';
import { cleanText } from './lib/validation';

export async function handleRecoverLink(req: Request, clientIp = 'unknown'): Promise<Response> {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  if (!checkRateLimit(`recover:${clientIp}`, 15, 60_000)) {
    return errorResponse('Too many recovery attempts. Please wait a moment and try again.', 429);
  }

  const parsed = await parseJsonBody<Record<string, unknown>>(req);
  if (!parsed.ok) {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const groupId = cleanText(parsed.data.groupId, 64);
  const songTitle = cleanText(parsed.data.songTitle, 140);
  const recoveryPhrase = cleanText(parsed.data.recoveryPhrase, 120);

  if (!groupId || !songTitle || !recoveryPhrase) {
    return errorResponse('Group ID, song title, and recovery phrase are required.', 400);
  }

  const storage = getStorage();
  const songHash = hashToken(`${groupId}:${songTitle.toLowerCase()}`);
  const recovery = await storage.getJSON<RecoveryRecord>(keys.recovery(groupId, songHash));

  if (!recovery) {
    return errorResponse('No matching submission with recovery enabled was found.', 404);
  }

  const incomingRecoveryHash = hashToken(`${groupId}:${recoveryPhrase}`);
  if (!timingSafeEqualHex(incomingRecoveryHash, recovery.recoveryHash)) {
    return errorResponse('Invalid song title or recovery phrase.', 403);
  }

  const [group, submission] = await Promise.all([
    storage.getJSON<GroupRecord>(keys.group(groupId)),
    storage.getJSON<SubmissionRecord>(keys.submission(groupId, recovery.participantId)),
  ]);

  if (!group || !submission || !group.participantIds.includes(recovery.participantId)) {
    return errorResponse('This participant submission is no longer active.', 404);
  }

  // Rotate to a fresh private token and invalidate the old token hash
  const newPrivateToken = generateSecretToken('prt');
  const newTokenHash = hashToken(newPrivateToken);
  const now = new Date().toISOString();

  const newTokenIndex: ParticipantTokenIndex = {
    groupId,
    participantId: recovery.participantId,
    createdAt: now,
  };

  await Promise.all([
    storage.delete(keys.participantToken(recovery.tokenHash)),
    storage.setJSON(keys.participantToken(newTokenHash), newTokenIndex, { onlyIfNew: true }),
    storage.setJSON(keys.recovery(groupId, songHash), {
      ...recovery,
      tokenHash: newTokenHash,
    }),
    storage.setJSON(keys.submission(groupId, recovery.participantId), {
      ...submission,
      tokenHash: newTokenHash,
    }),
  ]);

  const isDrawn = group.status === 'DRAWN' || group.status === 'COMPLETED';
  return jsonResponse({ privateToken: newPrivateToken, isDrawn });
}

export default async (req: Request, context: Context) => {
  return handleRecoverLink(req, context.ip ?? 'unknown');
};

export const config: Config = {
  path: '/api/recover-link',
  method: ['POST'],
};
