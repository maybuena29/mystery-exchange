import type { Config, Context } from '@netlify/functions';
import { verifySuperAdminToken } from './lib/crypto';
import {
  checkRateLimit,
  errorResponse,
  extractBearerToken,
  jsonResponse,
  parseJsonBody,
} from './lib/http';
import {
  getStorage,
  keys,
  type GroupRecord,
  type ParticipantSummary,
  type SubmissionRecord,
} from './lib/store';
import type {
  AdminGroupSummary,
  AdminOverviewResponse,
  AdminPlatformStats,
  AdminRecentActivityItem,
  EventCategory,
  EventStatus,
} from '../../src/types/exchange';

const ALL_STATUSES: EventStatus[] = [
  'CREATED',
  'COLLECTING',
  'REGISTRATION_CLOSED',
  'READY',
  'LOCKED',
  'DRAWN',
  'COMPLETED',
  'CANCELLED',
];

const ALL_CATEGORIES: EventCategory[] = [
  'Christmas',
  'Birthday',
  'Office Exchange',
  'Family Exchange',
  'Friends Exchange',
  'Custom',
];

function extractAdminKey(req: Request): string | null {
  const bearer = extractBearerToken(req);
  if (bearer) return bearer;

  const headerKey = req.headers.get('x-admin-key');
  if (headerKey && headerKey.trim()) return headerKey.trim();

  try {
    const url = new URL(req.url);
    const queryKey = url.searchParams.get('key');
    if (queryKey && queryKey.trim()) return queryKey.trim();
  } catch {
    // Ignore URL parse error
  }

  return null;
}

export async function handleAdmin(
  req: Request,
  actionParam = 'overview',
  targetGroupId = '',
  clientIp = 'unknown'
): Promise<Response> {
  const token = extractAdminKey(req);

  // Rate limit unauthorized attempts
  if (!checkRateLimit(`admin-auth:${clientIp}`, 20, 60_000)) {
    return errorResponse('Too many attempts. Please slow down and try again.', 429);
  }

  if (!token || !verifySuperAdminToken(token)) {
    return errorResponse('Unauthorized. Invalid Super Admin key.', 401);
  }

  const storage = getStorage();
  const url = new URL(req.url);
  const action = actionParam || url.searchParams.get('action') || 'overview';
  const effectiveGroupId = targetGroupId || url.searchParams.get('groupId') || '';

  // 1. Auth check
  if (action === 'auth') {
    return jsonResponse({
      ok: true,
      message: 'Super Admin authenticated successfully.',
    });
  }

  // 2. Delete Group (Super Admin maintenance / cleanup)
  if (req.method === 'DELETE' || action === 'delete_group') {
    if (!effectiveGroupId) {
      return errorResponse('Group ID is required for deletion.', 400);
    }

    const groupKey = keys.group(effectiveGroupId);
    const existing = await storage.getJSON<GroupRecord>(groupKey);
    if (!existing) {
      return errorResponse('Group not found.', 404);
    }

    // Delete group blob and draw lock
    await storage.delete(groupKey);
    try {
      await storage.delete(keys.drawLock(effectiveGroupId));
    } catch {
      // Ignore
    }

    // Update group-index if present
    try {
      const index = (await storage.getJSON<string[]>('group-index')) || [];
      const updated = index.filter((id) => id !== effectiveGroupId);
      await storage.setJSON('group-index', updated);
    } catch {
      // Ignore
    }

    return jsonResponse({
      ok: true,
      message: `Group ${effectiveGroupId} was deleted successfully.`,
      groupId: effectiveGroupId,
    });
  }

  // 3. Update Group Status (Super Admin override)
  if (
    action === 'update_status' ||
    action === 'change_status' ||
    action === 'status' ||
    (req.method === 'PATCH' && effectiveGroupId)
  ) {
    let targetId = effectiveGroupId;
    let nextStatusStr = '';

    const parsed = await parseJsonBody<{ status?: string; groupId?: string }>(req);
    if (parsed.ok) {
      if (typeof parsed.data.status === 'string') {
        nextStatusStr = parsed.data.status;
      }
      if (!targetId && typeof parsed.data.groupId === 'string') {
        targetId = parsed.data.groupId.trim();
      }
    }

    if (!targetId) {
      return errorResponse('Group ID is required to update status.', 400);
    }

    const nextStatus = nextStatusStr.trim().toUpperCase() as EventStatus;
    if (!ALL_STATUSES.includes(nextStatus)) {
      return errorResponse(
        `Invalid event status "${nextStatusStr}". Allowed values: ${ALL_STATUSES.join(', ')}`,
        400
      );
    }

    const groupKey = keys.group(targetId);
    const existing = await storage.getJSON<GroupRecord>(groupKey);
    if (!existing) {
      return errorResponse('Group not found.', 404);
    }

    const isPreDraw =
      nextStatus === 'CREATED' ||
      nextStatus === 'COLLECTING' ||
      nextStatus === 'REGISTRATION_CLOSED' ||
      nextStatus === 'READY';

    const now = new Date().toISOString();
    const updatedGroup: GroupRecord = {
      ...existing,
      status: nextStatus,
      updatedAt: now,
      drawnAt: isPreDraw ? undefined : (nextStatus === 'DRAWN' && !existing.drawnAt ? now : existing.drawnAt),
    };

    // If resetting to a pre-draw state, unlock drawLock and wipe previous assignments so a re-draw is possible
    if (isPreDraw) {
      try {
        await storage.delete(keys.drawLock(targetId));
      } catch {
        // Ignore
      }

      await Promise.all(
        existing.participantIds.map(async (pid) => {
          try {
            await storage.delete(keys.assignment(targetId, pid));
          } catch {
            // Ignore
          }
          try {
            await storage.delete(keys.giftProgress(targetId, pid));
          } catch {
            // Ignore
          }
          try {
            const sub = await storage.getJSON<SubmissionRecord>(keys.submission(targetId, pid));
            if (sub && sub.lockedWishlistItemIds) {
              const { lockedWishlistItemIds: _, ...rest } = sub;
              await storage.setJSON(keys.submission(targetId, pid), rest);
            }
          } catch {
            // Ignore
          }
        })
      );
    }

    await storage.setJSON(groupKey, updatedGroup);

    return jsonResponse({
      ok: true,
      message: `Group "${existing.groupName}" status updated to ${nextStatus}.`,
      groupId: targetId,
      status: nextStatus,
    });
  }

  // 4. Platform Overview & Groups List
  if (req.method === 'GET' || action === 'overview') {
    // Collect group IDs from storage listKeys and group-index blob
    const rawKeys = await storage.listKeys('groups/');
    const indexedKeys = (await storage.getJSON<string[]>('group-index')) || [];

    const groupIdSet = new Set<string>();
    for (const k of rawKeys) {
      const id = k.replace(/^groups\//, '');
      if (id && !id.includes('/')) {
        groupIdSet.add(id);
      }
    }
    for (const id of indexedKeys) {
      if (id && typeof id === 'string') {
        groupIdSet.add(id);
      }
    }

    const groupIds = Array.from(groupIdSet);

    // Fetch all group records concurrently
    const records = await Promise.all(
      groupIds.map(async (id) => {
        try {
          return await storage.getJSON<GroupRecord>(keys.group(id));
        } catch {
          return null;
        }
      })
    );

    const validGroups: GroupRecord[] = records.filter(
      (g): g is GroupRecord => g !== null && typeof g === 'object' && typeof g.groupId === 'string'
    );

    // Sort newest first
    validGroups.sort((a, b) => {
      const timeA = Date.parse(a.createdAt || '') || 0;
      const timeB = Date.parse(b.createdAt || '') || 0;
      return timeB - timeA;
    });

    // Compute aggregated platform stats
    let totalParticipants = 0;
    let totalWishlistsCompleted = 0;
    let totalDrawsCompleted = 0;
    let activeGroups = 0;
    let cancelledGroups = 0;

    const statusCounts: Record<EventStatus, number> = {
      CREATED: 0,
      COLLECTING: 0,
      REGISTRATION_CLOSED: 0,
      READY: 0,
      LOCKED: 0,
      DRAWN: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    const categoryCounts: Record<EventCategory, number> = {
      Christmas: 0,
      Birthday: 0,
      'Office Exchange': 0,
      'Family Exchange': 0,
      'Friends Exchange': 0,
      Custom: 0,
    };

    const recentActivity: AdminRecentActivityItem[] = [];

    const sanitizedAdminKey = token.startsWith('sa_') ? token.slice(3) : token;

    const groupSummaries: AdminGroupSummary[] = validGroups.map((g) => {
      const pCount = (g.participantIds || []).length;
      totalParticipants += pCount;

      const summaries = Object.values(g.participantSummaries || {}) as ParticipantSummary[];
      const wishlistsCompletedInGroup = summaries.filter((s) => s.wishlistCompleted).length;
      totalWishlistsCompleted += wishlistsCompletedInGroup;

      if (g.status === 'DRAWN' || g.status === 'COMPLETED') {
        totalDrawsCompleted += 1;
      } else if (g.status === 'CANCELLED') {
        cancelledGroups += 1;
      } else {
        activeGroups += 1;
      }

      if (ALL_STATUSES.includes(g.status)) {
        statusCounts[g.status] = (statusCounts[g.status] || 0) + 1;
      }

      const cat = g.category && ALL_CATEGORIES.includes(g.category) ? g.category : 'Custom';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      // Activity: Group created
      recentActivity.push({
        id: `act-create-${g.groupId}`,
        type: 'group_created',
        groupId: g.groupId,
        groupName: g.groupName,
        timestamp: g.createdAt || g.updatedAt || new Date().toISOString(),
        details: `Created in ${cat} category with ${pCount} slots reserved.`,
      });

      // Activity: Draw finalized
      if (g.drawnAt) {
        recentActivity.push({
          id: `act-draw-${g.groupId}`,
          type: 'draw_completed',
          groupId: g.groupId,
          groupName: g.groupName,
          timestamp: g.drawnAt,
          details: `Secret draw completed among ${pCount} participants.`,
        });
      }

      const anonymousSlots = (g.participantIds || []).map((pid, idx) => {
        const s = g.participantSummaries?.[pid];
        return {
          slotNumber: idx + 1,
          slotId: pid,
          songTitle: s?.songTitle || `Participant #${idx + 1}`,
          artist: s?.artist,
          joinedAt: s?.joinedAt || g.createdAt,
          wishlistCompleted: s?.wishlistCompleted ?? false,
        };
      });

      return {
        groupId: g.groupId,
        groupName: g.groupName,
        description: g.description,
        category: g.category,
        eventDate: g.eventDate,
        registrationDeadline: g.registrationDeadline,
        instructions: g.instructions,
        budget: g.budget,
        settings: g.settings,
        status: g.status,
        participantCount: pCount,
        completedWishlistCount: wishlistsCompletedInGroup,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        drawnAt: g.drawnAt,
        invitationUrl: `/join/${encodeURIComponent(g.groupId)}`,
        organizerUrl: `/organizer/${encodeURIComponent(g.groupId)}#token=sa_${encodeURIComponent(sanitizedAdminKey)}`,
        anonymousSlots,
      };
    });

    // Sort recent activity newest first
    recentActivity.sort((a, b) => {
      const timeA = Date.parse(a.timestamp) || 0;
      const timeB = Date.parse(b.timestamp) || 0;
      return timeB - timeA;
    });

    const totalGroups = validGroups.length;
    const wishlistCompletionRate =
      totalParticipants > 0 ? Math.round((totalWishlistsCompleted / totalParticipants) * 100) : 0;
    const drawCompletionRate =
      totalGroups > 0 ? Math.round((totalDrawsCompleted / totalGroups) * 100) : 0;

    const stats: AdminPlatformStats = {
      totalGroups,
      totalParticipants,
      totalWishlistsCompleted,
      totalDrawsCompleted,
      activeGroups,
      cancelledGroups,
      wishlistCompletionRate,
      drawCompletionRate,
      statusCounts,
      categoryCounts,
      recentActivity: recentActivity.slice(0, 30),
    };

    const response: AdminOverviewResponse = {
      stats,
      groups: groupSummaries,
    };

    return jsonResponse(response);
  }

  return errorResponse('Invalid action or method.', 405);
}

export default async (req: Request, context: Context) => {
  const actionParam = context.params?.action ?? '';
  const groupIdParam = context.params?.groupId ?? '';
  return handleAdmin(req, actionParam, groupIdParam, context.ip ?? 'unknown');
};

export const config: Config = {
  path: ['/api/admin', '/api/admin/:action', '/api/admin/:action/:groupId'],
  method: ['GET', 'POST', 'PATCH', 'DELETE'],
};
