import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiClient,
  ensureCsrfCookie,
  getCookieValue,
  setUnauthorizedHandler,
} from '@/lib/api-client';
import { ApiError, isApiError } from '@/lib/api-error';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

function clearXsrfCookie(): void {
  document.cookie =
    'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

describe('apiClient', () => {
  beforeEach(() => {
    clearXsrfCookie();
    setUnauthorizedHandler(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearXsrfCookie();
    setUnauthorizedHandler(null);
  });

  it('sends GET requests with credentials, JSON headers, and serialized query parameters', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ data: { status: 'ok' } }));

    const result = await apiClient.get<{ data: { status: string } }>(
      '/products',
      {
        params: {
          q: 'laptop',
          brand: ['asus', 'lenovo'],
          empty: undefined,
          page: 2,
        },
      },
    );

    expect(result).toEqual({ data: { status: 'ok' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      '/api/v1/products?q=laptop&brand%5B%5D=asus&brand%5B%5D=lenovo&page=2',
    );
    expect(init?.method).toBe('GET');
    expect(init?.credentials).toBe('include');

    const headers = new Headers(init?.headers);
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
  });

  it('fetches the Sanctum CSRF cookie before mutating requests when XSRF-TOKEN is absent', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        if (input === '/sanctum/csrf-cookie') {
          document.cookie = `XSRF-TOKEN=${encodeURIComponent('token+with/special=')}; path=/`;
          return new Response(null, { status: 204 });
        }

        return jsonResponse({ data: { id: 1 } }, { status: 201 });
      });

    const response = await apiClient.post<{ data: { id: number } }>(
      '/auth/register',
      { name: 'Asha' },
    );

    expect(response).toEqual({ data: { id: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/sanctum/csrf-cookie');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/auth/register');

    const postHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(postHeaders.get('X-XSRF-TOKEN')).toBe('token+with/special=');
    expect(postHeaders.get('Content-Type')).toBe('application/json');
  });

  it('deduplicates concurrent CSRF cookie fetches and skips fetching when token exists', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        document.cookie = 'XSRF-TOKEN=shared-token; path=/';
        return new Response(null, { status: 204 });
      });

    await Promise.all([ensureCsrfCookie(), ensureCsrfCookie()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getCookieValue('XSRF-TOKEN')).toBe('shared-token');

    await ensureCsrfCookie();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes the CSRF cookie and retries once when the API responds with 419', async () => {
    document.cookie = 'XSRF-TOKEN=stale-token; path=/';

    let postAttempts = 0;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        if (input === '/sanctum/csrf-cookie') {
          document.cookie = 'XSRF-TOKEN=fresh-token; path=/';
          return new Response(null, { status: 204 });
        }

        postAttempts += 1;

        if (postAttempts === 1) {
          return jsonResponse(
            {
              error: {
                code: 'csrf_token_mismatch',
                message: 'CSRF token mismatch.',
                request_id: 'req-419',
              },
            },
            { status: 419 },
          );
        }

        return jsonResponse({ data: { ok: true } });
      });

    const result = await apiClient.post<{ data: { ok: boolean } }>(
      '/auth/login',
      { email: 'a@example.com', password: 'secret' },
    );

    expect(result).toEqual({ data: { ok: true } });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const firstHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    const retryHeaders = new Headers(fetchMock.mock.calls[2]?.[1]?.headers);
    expect(firstHeaders.get('X-XSRF-TOKEN')).toBe('stale-token');
    expect(retryHeaders.get('X-XSRF-TOKEN')).toBe('fresh-token');
  });

  it('normalizes canonical 422 validation errors with field details and request id', async () => {
    document.cookie = 'XSRF-TOKEN=valid-token; path=/';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 'validation_failed',
            message: 'The email has already been taken.',
            details: {
              email: ['The email has already been taken.'],
              password: ['The password must be at least 8 characters.'],
            },
            request_id: 'req-422-1',
          },
        },
        { status: 422, headers: { 'X-Request-Id': 'req-422-1' } },
      ),
    );

    let caughtError: unknown;

    try {
      await apiClient.post('/auth/register', { email: 'taken@example.com' });
    } catch (error: unknown) {
      caughtError = error;
    }

    expect(isApiError(caughtError)).toBe(true);
    const apiError = caughtError as ApiError;
    expect(apiError.status).toBe(422);
    expect(apiError.code).toBe('validation_failed');
    expect(apiError.message).toBe('The email has already been taken.');
    expect(apiError.requestId).toBe('req-422-1');
    expect(apiError.getFieldErrors()).toEqual({
      email: ['The email has already been taken.'],
      password: ['The password must be at least 8 characters.'],
    });
    expect(apiError.getFirstFieldError('email')).toBe(
      'The email has already been taken.',
    );
  });

  it('parses Retry-After header for 429 rate-limited errors', async () => {
    document.cookie = 'XSRF-TOKEN=valid-token; path=/';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: 'rate_limited',
            message: 'Too many attempts. Try again in a minute.',
            request_id: 'req-429',
          },
        },
        { status: 429, headers: { 'Retry-After': '58' } },
      ),
    );

    await expect(apiClient.post('/auth/login', {})).rejects.toMatchObject({
      status: 429,
      code: 'rate_limited',
      retryAfterSeconds: 58,
    });
  });

  it('invokes unauthorized handler on 401 unless skipUnauthorizedHandler is set', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
          { status: 401 },
        ),
      );

    await expect(
      apiClient.get('/auth/me', { skipUnauthorizedHandler: true }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();

    await expect(apiClient.get('/wishlist')).rejects.toMatchObject({
      status: 401,
      code: 'unauthenticated',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('normalizes non-JSON server errors and network failures safely', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response('<html>Bad Gateway</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      )
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiClient.get('/health')).rejects.toMatchObject({
      status: 502,
      code: 'internal_error',
    });

    await expect(apiClient.get('/health')).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
    });
  });

  it('handles 204 No Content and omits Content-Type for FormData payloads', async () => {
    document.cookie = 'XSRF-TOKEN=valid-token; path=/';

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ data: { uploaded: true } }));

    const deleted = await apiClient.delete('/wishlist/1');
    expect(deleted).toBeUndefined();

    const formData = new FormData();
    formData.append('image', new Blob(['img']), 'photo.png');

    await apiClient.post('/admin/products/1/images', formData);

    const formHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(formHeaders.has('Content-Type')).toBe(false);
    expect(formHeaders.get('X-XSRF-TOKEN')).toBe('valid-token');
  });
});
