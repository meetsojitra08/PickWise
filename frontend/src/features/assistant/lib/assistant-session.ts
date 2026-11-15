const GUEST_SESSION_KEY_STORAGE = 'pickwise:assistant_session_key';

/**
 * Return a persistent guest session identifier so a non-logged-in shopper
 * keeps their conversation history across reloads and navigation.
 */
export function getAssistantSessionKey(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'guest-default';
  }

  let sessionKey = window.localStorage.getItem(GUEST_SESSION_KEY_STORAGE);
  if (!sessionKey || sessionKey.trim() === '') {
    sessionKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    window.localStorage.setItem(GUEST_SESSION_KEY_STORAGE, sessionKey);
  }

  return sessionKey;
}

export function getAssistantHeaders(): HeadersInit {
  return {
    'X-Session-Key': getAssistantSessionKey(),
  };
}
