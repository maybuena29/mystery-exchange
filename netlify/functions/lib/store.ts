import { getStore } from '@netlify/blobs';
import type {
  BudgetSettings,
  DrawReadiness,
  EventCategory,
  EventStatus,
  GiftChecklist,
  GroupSettings,
  OrganizerGroupView,
  ParticipantPreferences,
  PublicGroupInfo,
  WishlistItem,
} from '../../../src/types/exchange';

export interface ParticipantSummary {
  songTitle: string;
  artist?: string;
  joinedAt: string;
  wishlistCompleted: boolean;
}

export interface GroupRecord {
  groupId: string;
  groupName: string;
  description?: string;
  category: EventCategory;
  eventDate?: string;
  registrationDeadline?: string;
  instructions?: string;
  budget: BudgetSettings;
  settings: GroupSettings;
  status: EventStatus;
  organizerTokenHash: string;
  participantIds: string[];
  participantSummaries: Record<string, ParticipantSummary>;
  createdAt: string;
  updatedAt: string;
  drawnAt?: string;
}

export interface ParticipantTokenIndex {
  groupId: string;
  participantId: string;
  createdAt: string;
}

export interface SubmissionRecord {
  groupId: string;
  participantId: string;
  songTitle: string;
  artist?: string;
  wishlist: WishlistItem[];
  preferences: ParticipantPreferences;
  wishlistCompleted: boolean;
  tokenHash?: string;
  songHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryRecord {
  groupId: string;
  participantId: string;
  recoveryHash: string;
  tokenHash: string;
  createdAt: string;
}

export interface AssignmentRecord {
  groupId: string;
  giverParticipantId: string;
  recipientParticipantId: string;
  finalizedAt: string;
}

export interface GiftProgressRecord {
  groupId: string;
  giverParticipantId: string;
  checklist: GiftChecklist;
  privateNotes: string;
  updatedAt: string;
}

export interface DrawLockRecord {
  groupId: string;
  lockedAt: string;
}

export interface SetOptions {
  onlyIfNew?: boolean;
  onlyIfMatch?: string;
}

export interface SetResult {
  modified: boolean;
  etag?: string;
}

export interface GetWithEtagResult<T> {
  data: T;
  etag: string;
}

export interface StorageAdapter {
  getJSON<T>(key: string): Promise<T | null>;
  getJSONWithEtag<T>(key: string): Promise<GetWithEtagResult<T> | null>;
  setJSON<T>(key: string, value: T, options?: SetOptions): Promise<SetResult>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory storage adapter used for automated Vitest tests or when
 * Netlify Blobs runtime context is not injected.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private map = new Map<string, { raw: string; etag: string }>();
  private seq = 0;

  async getJSON<T>(key: string): Promise<T | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    return JSON.parse(entry.raw) as T;
  }

  async getJSONWithEtag<T>(key: string): Promise<GetWithEtagResult<T> | null> {
    const entry = this.map.get(key);
    if (!entry) return null;
    return { data: JSON.parse(entry.raw) as T, etag: entry.etag };
  }

  async setJSON<T>(key: string, value: T, options?: SetOptions): Promise<SetResult> {
    const existing = this.map.get(key);
    if (options?.onlyIfNew && existing) {
      return { modified: false };
    }
    if (options?.onlyIfMatch !== undefined) {
      if (!existing || existing.etag !== options.onlyIfMatch) {
        return { modified: false };
      }
    }
    this.seq += 1;
    const etag = `mem-etag-${this.seq}`;
    this.map.set(key, { raw: JSON.stringify(value), etag });
    return { modified: true, etag };
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

class NetlifyBlobsStorageAdapter implements StorageAdapter {
  private get store() {
    return getStore({ name: 'mystery-exchange', consistency: 'strong' });
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const res = await this.store.get(key, { type: 'json', consistency: 'strong' });
    return (res as T | null) ?? null;
  }

  async getJSONWithEtag<T>(key: string): Promise<GetWithEtagResult<T> | null> {
    const res = await this.store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
    if (res === null) return null;
    return {
      data: res.data as T,
      etag: res.etag ?? '',
    };
  }

  async setJSON<T>(key: string, value: T, options?: SetOptions): Promise<SetResult> {
    const blobOptions = options?.onlyIfNew
      ? { onlyIfNew: true as const }
      : options?.onlyIfMatch !== undefined
        ? { onlyIfMatch: options.onlyIfMatch }
        : undefined;
    const res = await this.store.setJSON(key, value, blobOptions);
    return { modified: res.modified, etag: res.etag };
  }

  async delete(key: string): Promise<void> {
    await this.store.delete(key);
  }
}

let customAdapter: StorageAdapter | null = null;
const netlifyAdapter = new NetlifyBlobsStorageAdapter();

export function setStorageAdapter(adapter: StorageAdapter | null): void {
  customAdapter = adapter;
}

export function getStorage(): StorageAdapter {
  if (customAdapter) return customAdapter;
  return netlifyAdapter;
}

export const keys = {
  group: (groupId: string) => `groups/${groupId}`,
  participantToken: (tokenHash: string) => `participants/${tokenHash}`,
  submission: (groupId: string, participantId: string) => `submissions/${groupId}/${participantId}`,
  assignment: (groupId: string, giverParticipantId: string) => `assignments/${groupId}/${giverParticipantId}`,
  giftProgress: (groupId: string, giverParticipantId: string) => `gift-progress/${groupId}/${giverParticipantId}`,
  drawLock: (groupId: string) => `locks/${groupId}`,
  recovery: (groupId: string, songHash: string) => `recovery/${groupId}/${songHash}`,
};

export function isRegistrationOpen(group: GroupRecord): boolean {
  if (group.status !== 'CREATED' && group.status !== 'COLLECTING') {
    return false;
  }
  if (group.participantIds.length >= group.settings.maxParticipants) {
    return false;
  }
  if (group.registrationDeadline) {
    const deadlineMs = Date.parse(group.registrationDeadline);
    if (!Number.isNaN(deadlineMs) && Date.now() > deadlineMs) {
      return false;
    }
  }
  return true;
}

export function computeDrawReadiness(group: GroupRecord): DrawReadiness {
  const reasons: string[] = [];
  const count = group.participantIds.length;
  const completedCount = Object.values(group.participantSummaries).filter((s) => s.wishlistCompleted).length;

  if (group.status === 'DRAWN' || group.status === 'COMPLETED') {
    reasons.push('The draw has already been completed.');
  } else if (group.status === 'CANCELLED') {
    reasons.push('This exchange has been cancelled.');
  } else if (group.status === 'LOCKED') {
    reasons.push('The draw is currently in progress.');
  } else {
    if (group.status !== 'REGISTRATION_CLOSED' && group.status !== 'READY') {
      reasons.push('Close registration before starting the draw.');
    }
    if (count < 3) {
      reasons.push(`At least 3 participants are required (currently ${count}).`);
    }
    if (group.settings.requireCompletedWishlist && completedCount < count) {
      reasons.push(`All participants must complete a wishlist (${completedCount}/${count} completed).`);
    }
  }

  return {
    isReady: reasons.length === 0,
    reasons,
  };
}

export function toPublicGroupInfo(group: GroupRecord): PublicGroupInfo {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
    description: group.description,
    category: group.category,
    eventDate: group.eventDate,
    registrationDeadline: group.registrationDeadline,
    instructions: group.instructions,
    budget: group.budget,
    settings: group.settings,
    status: group.status,
    participantCount: group.participantIds.length,
    isOpenForJoining: isRegistrationOpen(group),
  };
}

/**
 * Projects a GroupRecord into the OrganizerGroupView.
 * Strictly excludes participantIds, songs, wishlists, and assignments.
 */
export function toOrganizerGroupView(group: GroupRecord): OrganizerGroupView {
  const completedWishlistCount = Object.values(group.participantSummaries).filter(
    (s) => s.wishlistCompleted
  ).length;

  const anonymousSlots = group.participantIds.map((pid, idx) => {
    const summary = group.participantSummaries[pid];
    return {
      slotNumber: idx + 1,
      slotId: pid,
      songTitle: summary?.songTitle ?? `Participant #${idx + 1}`,
      artist: summary?.artist,
      joinedAt: summary?.joinedAt ?? group.createdAt,
      wishlistCompleted: summary?.wishlistCompleted ?? false,
    };
  });

  return {
    ...toPublicGroupInfo(group),
    completedWishlistCount,
    anonymousSlots,
    drawReadiness: computeDrawReadiness(group),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    drawnAt: group.drawnAt,
  };
}
