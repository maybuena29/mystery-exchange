import type {
  AdminOverviewResponse,
  CreateGroupPayload,
  CreateGroupResponse,
  EventStatus,
  GiftProgress,
  JoinGroupPayload,
  JoinGroupResponse,
  OrganizerGroupView,
  ParticipantPreferences,
  ParticipantSessionView,
  PublicGroupInfo,
  WishlistItem,
  WheelEntry,
  WheelWinnerRecord,
  WheelViewState,
} from '../types/exchange';

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  bearerToken?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const groupService = {
  createGroup(payload: CreateGroupPayload): Promise<CreateGroupResponse> {
    return requestJson<CreateGroupResponse>('/api/create-group', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPublicGroup(groupId: string): Promise<PublicGroupInfo> {
    const res = await requestJson<{ group: PublicGroupInfo }>(
      `/api/group/${encodeURIComponent(groupId)}`
    );
    return res.group;
  },

  async getOrganizerGroup(groupId: string, organizerToken: string): Promise<OrganizerGroupView> {
    const res = await requestJson<{ group: OrganizerGroupView }>(
      `/api/organizer/${encodeURIComponent(groupId)}`,
      { method: 'GET' },
      organizerToken
    );
    return res.group;
  },

  async organizerAction(
    groupId: string,
    organizerToken: string,
    body: Record<string, unknown>
  ): Promise<OrganizerGroupView> {
    const res = await requestJson<{ group: OrganizerGroupView }>(
      `/api/organizer/${encodeURIComponent(groupId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      organizerToken
    );
    return res.group;
  },

  async startDraw(
    groupId: string,
    organizerToken: string,
    options?: { redraw?: boolean }
  ): Promise<OrganizerGroupView> {
    const res = await requestJson<{ group: OrganizerGroupView }>(
      '/api/start-draw',
      {
        method: 'POST',
        body: JSON.stringify({ groupId, redraw: options?.redraw ?? false }),
      },
      organizerToken
    );
    return res.group;
  },

  async redraw(groupId: string, organizerToken: string): Promise<OrganizerGroupView> {
    return this.startDraw(groupId, organizerToken, { redraw: true });
  },

  async regenerateParticipantLink(
    groupId: string,
    organizerToken: string,
    slotId: string
  ): Promise<{ privateToken: string; isDrawn: boolean; songTitle: string; artist?: string }> {
    return requestJson(
      `/api/organizer/${encodeURIComponent(groupId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action: 'regenerate_participant_link', slotId }),
      },
      organizerToken
    );
  },
};

export const participantService = {
  joinGroup(payload: JoinGroupPayload): Promise<JoinGroupResponse> {
    return requestJson<JoinGroupResponse>('/api/join-group', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getSession(privateToken: string): Promise<ParticipantSessionView> {
    const res = await requestJson<{ session: ParticipantSessionView }>(
      '/api/participant/session',
      { method: 'GET' },
      privateToken
    );
    return res.session;
  },

  async updateWishlist(
    privateToken: string,
    wishlist: WishlistItem[],
    preferences: ParticipantPreferences
  ): Promise<{
    wishlist: WishlistItem[];
    preferences: ParticipantPreferences;
    wishlistCompleted: boolean;
    lockedWishlistItemIds?: string[];
  }> {
    return requestJson(
      '/api/participant/wishlist',
      {
        method: 'PUT',
        body: JSON.stringify({ wishlist, preferences }),
      },
      privateToken
    );
  },

  async updateGiftProgress(
    privateToken: string,
    giftProgress: Omit<GiftProgress, 'updatedAt'>
  ): Promise<{ giftProgress: GiftProgress }> {
    return requestJson(
      '/api/participant/gift-progress',
      {
        method: 'PUT',
        body: JSON.stringify(giftProgress),
      },
      privateToken
    );
  },

  async recoverLink(payload: {
    groupId: string;
    songTitle: string;
    recoveryPhrase: string;
  }): Promise<{ privateToken: string; isDrawn: boolean }> {
    return requestJson('/api/recover-link', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export const adminService = {
  async authenticate(adminKey: string): Promise<{ ok: boolean; message: string }> {
    return requestJson<{ ok: boolean; message: string }>(
      '/api/admin/auth',
      { method: 'GET' },
      adminKey
    );
  },

  async getOverview(adminKey: string): Promise<AdminOverviewResponse> {
    return requestJson<AdminOverviewResponse>(
      '/api/admin/overview',
      { method: 'GET' },
      adminKey
    );
  },

  async deleteGroup(groupId: string, adminKey: string): Promise<{ ok: boolean; message: string; groupId: string }> {
    return requestJson<{ ok: boolean; message: string; groupId: string }>(
      `/api/admin/delete_group/${encodeURIComponent(groupId)}`,
      { method: 'DELETE' },
      adminKey
    );
  },

  async updateGroupStatus(
    groupId: string,
    status: EventStatus,
    adminKey: string
  ): Promise<{ ok: boolean; message: string; groupId: string; status: EventStatus }> {
    return requestJson<{ ok: boolean; message: string; groupId: string; status: EventStatus }>(
      `/api/admin/update_status/${encodeURIComponent(groupId)}`,
      {
        method: 'POST',
        body: JSON.stringify({ status }),
      },
      adminKey
    );
  },
};

export const wheelService = {
  async getWheelState(groupId: string, organizerToken?: string | null): Promise<WheelViewState> {
    return requestJson<WheelViewState>(
      `/api/wheel/${encodeURIComponent(groupId)}`,
      { method: 'GET' },
      organizerToken
    );
  },

  async spin(
    groupId: string,
    entryId: string,
    organizerToken: string
  ): Promise<{
    success: boolean;
    winner: WheelWinnerRecord;
    remainingCount: number;
    entries: WheelEntry[];
    winnerHistory: WheelWinnerRecord[];
  }> {
    return requestJson(
      `/api/wheel/${encodeURIComponent(groupId)}/spin`,
      {
        method: 'POST',
        body: JSON.stringify({ entryId }),
      },
      organizerToken
    );
  },

  async addEntry(
    groupId: string,
    songTitle: string,
    artist: string | undefined,
    organizerToken: string
  ): Promise<{ success: boolean; entry: WheelEntry; entries: WheelEntry[] }> {
    return requestJson(
      `/api/wheel/${encodeURIComponent(groupId)}/entries`,
      {
        method: 'POST',
        body: JSON.stringify({ subOp: 'add', songTitle, artist }),
      },
      organizerToken
    );
  },

  async editEntry(
    groupId: string,
    entryId: string,
    songTitle: string,
    artist: string | undefined,
    organizerToken: string
  ): Promise<{ success: boolean; entry: WheelEntry; entries: WheelEntry[] }> {
    return requestJson(
      `/api/wheel/${encodeURIComponent(groupId)}/entries`,
      {
        method: 'POST',
        body: JSON.stringify({ subOp: 'edit', entryId, songTitle, artist }),
      },
      organizerToken
    );
  },

  async toggleExcludeEntry(
    groupId: string,
    entryId: string,
    organizerToken: string
  ): Promise<{ success: boolean; entry: WheelEntry; entries: WheelEntry[] }> {
    return requestJson(
      `/api/wheel/${encodeURIComponent(groupId)}/entries`,
      {
        method: 'POST',
        body: JSON.stringify({ subOp: 'toggle_exclude', entryId }),
      },
      organizerToken
    );
  },

  async removeEntry(
    groupId: string,
    entryId: string,
    organizerToken: string
  ): Promise<{ success: boolean; entries: WheelEntry[] }> {
    return requestJson(
      `/api/wheel/${encodeURIComponent(groupId)}/entries`,
      {
        method: 'POST',
        body: JSON.stringify({ subOp: 'remove', entryId }),
      },
      organizerToken
    );
  },

  async resetWheel(
    groupId: string,
    organizerToken: string
  ): Promise<{
    success: boolean;
    message: string;
    entries: WheelEntry[];
    winnerHistory: WheelWinnerRecord[];
  }> {
    return requestJson(
      `/api/wheel/${encodeURIComponent(groupId)}/reset`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      },
      organizerToken
    );
  },

  async revealWinner(
    groupId: string,
    winnerId: string,
    organizerToken: string
  ): Promise<{
    success: boolean;
    entries: WheelEntry[];
    winnerHistory: WheelWinnerRecord[];
    totalActiveCount: number;
    totalWinnersCount: number;
  }> {
    return requestJson(
      `/api/wheel/${encodeURIComponent(groupId)}/reveal`,
      {
        method: 'POST',
        body: JSON.stringify({ winnerId }),
      },
      organizerToken
    );
  },
};
