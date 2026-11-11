import { isRecord } from '@/lib/api-error';

const AUTH_ENTRY_PATHS = new Set(['/login', '/register']);

function extractCandidatePath(state: unknown): string | null {
  if (!isRecord(state)) {
    return null;
  }

  const from = state.from;

  if (typeof from === 'string') {
    return from;
  }

  if (isRecord(from) && typeof from.pathname === 'string') {
    const search = typeof from.search === 'string' ? from.search : '';
    const hash = typeof from.hash === 'string' ? from.hash : '';

    return `${from.pathname}${search}${hash}`;
  }

  return null;
}

export function resolveSafeRedirectPath(
  state: unknown,
  fallback = '/',
): string {
  const candidate = extractCandidatePath(state);

  if (!candidate) {
    return fallback;
  }

  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.startsWith('/\\')
  ) {
    return fallback;
  }

  const pathnameOnly = candidate.split(/[?#]/, 1)[0];

  if (AUTH_ENTRY_PATHS.has(pathnameOnly)) {
    return fallback;
  }

  return candidate;
}
