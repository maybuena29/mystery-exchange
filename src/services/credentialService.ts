const ORG_PREFIX = 'me_org_';

export function saveOrganizerToken(groupId: string, token: string): void {
  try {
    sessionStorage.setItem(`${ORG_PREFIX}${groupId}`, token);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function getOrganizerToken(groupId: string): string | null {
  if (typeof window === 'undefined') return null;

  // Check URL hash fragment (#token=...) first so bookmarked management links work
  const hash = window.location.hash;
  if (hash && hash.includes('token=')) {
    const params = new URLSearchParams(hash.slice(1));
    const hashToken = params.get('token');
    if (hashToken && hashToken.startsWith('org_')) {
      saveOrganizerToken(groupId, hashToken);
      return hashToken;
    }
  }

  try {
    return sessionStorage.getItem(`${ORG_PREFIX}${groupId}`);
  } catch {
    return null;
  }
}

export function clearOrganizerToken(groupId: string): void {
  try {
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
