const BASE_URL = '/api';

// Thin wrapper around fetch that attaches the JWT from storage and serialises the
// request body as JSON. Throws a plain object with status and message on non-2xx responses.
export async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, message: err.error || 'Request failed' };
  }

  return res.json();
}
