import type {
  CreateGroupPayload,
  CreateGroupResponse,
  GiftProgress,
  JoinGroupPayload,
  JoinGroupResponse,
  OrganizerGroupView,
  ParticipantPreferences,
  ParticipantSessionView,
  PublicGroupInfo,
  WishlistItem,
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

  async startDraw(groupId: string, organizerToken: string): Promise<OrganizerGroupView> {
    const res = await requestJson<{ group: OrganizerGroupView }>(
      '/api/start-draw',
      {
        method: 'POST',
        body: JSON.stringify({ groupId }),
      },
      organizerToken
    );
    return res.group;
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
  ): Promise<{ wishlist: WishlistItem[]; preferences: ParticipantPreferences; wishlistCompleted: boolean }> {
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
