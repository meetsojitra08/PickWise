/**
 * Return the URL only when it uses an explicit http: or https: scheme,
 * preventing stored javascript:, data:, or file: links from reaching <a href>.
 */
export function getSafeExternalUrl(
  rawUrl: string | null | undefined,
): string | null {
  if (!rawUrl) {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (trimmed === '') {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
