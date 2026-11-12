import type { Config, Context } from '@netlify/functions';
import { errorResponse, jsonResponse } from './lib/http';
import { getStorage, keys, toPublicGroupInfo, type GroupRecord } from './lib/store';

export async function handleGetGroup(req: Request, groupId: string): Promise<Response> {
  if (req.method !== 'GET') {
    return errorResponse('Method not allowed.', 405);
  }

  if (!groupId || groupId.length > 64) {
    return errorResponse('Invalid group ID.', 400);
  }

  const storage = getStorage();
  const group = await storage.getJSON<GroupRecord>(keys.group(groupId));
  if (!group) {
    return errorResponse('Exchange group not found.', 404);
  }

  return jsonResponse({ group: toPublicGroupInfo(group) });
}

export default async (req: Request, context: Context) => {
  return handleGetGroup(req, context.params.groupId ?? '');
};

export const config: Config = {
  path: '/api/group/:groupId',
  method: ['GET'],
};
