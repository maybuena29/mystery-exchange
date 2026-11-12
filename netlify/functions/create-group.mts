import type { Config, Context } from '@netlify/functions';
import { generateSecretToken, generateUrlSafeId, hashToken } from './lib/crypto';
import { checkRateLimit, errorResponse, jsonResponse, parseJsonBody } from './lib/http';
import { getStorage, keys, toOrganizerGroupView, type GroupRecord } from './lib/store';
import { validateCreateGroupPayload } from './lib/validation';

export async function handleCreateGroup(req: Request, clientIp = 'unknown'): Promise<Response> {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  if (!checkRateLimit(`create:${clientIp}`, 20, 60_000)) {
    return errorResponse('Too many requests. Please wait a moment and try again.', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) {
    return errorResponse('Invalid JSON payload.', 400);
  }

  const validation = validateCreateGroupPayload(parsed.data);
  if (!validation.valid || !validation.data) {
    return errorResponse(validation.error ?? 'Invalid group details.', 400);
  }

  const storage = getStorage();
  const groupId = generateUrlSafeId(8);
  const organizerToken = generateSecretToken('org');
  const organizerTokenHash = hashToken(organizerToken);
  const now = new Date().toISOString();

  const record: GroupRecord = {
    groupId,
    groupName: validation.data.groupName,
    description: validation.data.description,
    category: validation.data.category,
    eventDate: validation.data.eventDate,
    registrationDeadline: validation.data.registrationDeadline,
    instructions: validation.data.instructions,
    budget: validation.data.budget,
    settings: validation.data.settings,
    status: 'CREATED',
    organizerTokenHash,
    participantIds: [],
    participantSummaries: {},
    createdAt: now,
    updatedAt: now,
  };

  const saved = await storage.setJSON(keys.group(groupId), record, { onlyIfNew: true });
  if (!saved.modified) {
    return errorResponse('Could not create group due to ID collision. Please retry.', 409);
  }

  return jsonResponse(
    {
      groupId,
      organizerToken,
      group: toOrganizerGroupView(record),
    },
    201
  );
}

export default async (req: Request, context: Context) => {
  return handleCreateGroup(req, context.ip ?? 'unknown');
};

export const config: Config = {
  path: '/api/create-group',
  method: ['POST'],
};
