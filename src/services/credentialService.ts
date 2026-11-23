const ORG_PREFIX = 'me_org_';
const SUPER_ADMIN_KEY_STORAGE = 'hw_super_admin_key';

export function saveOrganizerToken(groupId: string, token: string): void {
  try {
    localStorage.setItem(`${ORG_PREFIX}${groupId}`, token);
  } catch {
    // Fallback if localStorage is restricted
    try {
      sessionStorage.setItem(`${ORG_PREFIX}${groupId}`, token);
    } catch {
      // Ignore
    }
  }
}

export function getOrganizerToken(groupId: string): string | null {
  if (typeof window === 'undefined') return null;

  // Check URL hash fragment (#token=...) first so bookmarked management links work
  const hash = window.location.hash;
  if (hash && hash.includes('token=')) {
    const params = new URLSearchParams(hash.slice(1));
    const hashToken = params.get('token');
    if (hashToken && (hashToken.startsWith('org_') || hashToken.startsWith('sa_') || hashToken.length >= 8)) {
      saveOrganizerToken(groupId, hashToken);
      return hashToken;
    }
  }

  // Check URL search parameters (?token=...)
  if (window.location.search && window.location.search.includes('token=')) {
    const params = new URLSearchParams(window.location.search);
    const searchToken = params.get('token');
    if (searchToken && (searchToken.startsWith('org_') || searchToken.startsWith('sa_') || searchToken.length >= 8)) {
      saveOrganizerToken(groupId, searchToken);
      return searchToken;
    }
  }

  try {
    return localStorage.getItem(`${ORG_PREFIX}${groupId}`) || sessionStorage.getItem(`${ORG_PREFIX}${groupId}`);
  } catch {
    return null;
  }
}

export function saveSuperAdminKey(key: string, remember = false): void {
  try {
    sessionStorage.setItem(SUPER_ADMIN_KEY_STORAGE, key);
    if (remember) {
      localStorage.setItem(SUPER_ADMIN_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(SUPER_ADMIN_KEY_STORAGE);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getSuperAdminKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(SUPER_ADMIN_KEY_STORAGE) || localStorage.getItem(SUPER_ADMIN_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function clearSuperAdminKey(): void {
  try {
    sessionStorage.removeItem(SUPER_ADMIN_KEY_STORAGE);
    localStorage.removeItem(SUPER_ADMIN_KEY_STORAGE);
  } catch {
    // Ignore
  }
}

export function buildAdminOrganizerUrl(groupId: string, superAdminKey?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = `${origin}/organizer/${encodeURIComponent(groupId)}`;
  if (!superAdminKey) return base;
  const token = superAdminKey.startsWith('sa_') ? superAdminKey : `sa_${superAdminKey}`;
  return `${base}#token=${encodeURIComponent(token)}`;
}

export function clearOrganizerToken(groupId: string): void {
  try {
    localStorage.removeItem(`${ORG_PREFIX}${groupId}`);
    sessionStorage.removeItem(`${ORG_PREFIX}${groupId}`);
  } catch {
    // Ignore
  }
}

export function buildInvitationUrl(groupId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/join/${encodeURIComponent(groupId)}`;
}

export function buildOrganizerUrl(groupId: string, organizerToken?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = `${origin}/organizer/${encodeURIComponent(groupId)}`;
  return organizerToken ? `${base}#token=${encodeURIComponent(organizerToken)}` : base;
}

export function buildParticipantUrl(privateToken: string, isDrawn = false): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const path = isDrawn ? 'result' : 'participant';
  return `${origin}/${path}/${encodeURIComponent(privateToken)}`;
}
