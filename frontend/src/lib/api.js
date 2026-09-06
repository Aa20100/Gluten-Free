/**
 * Centralized API client. Add one function per backend endpoint here; keep
 * components free of raw fetch / URL construction.
 *
 * Base URL is read from NEXT_PUBLIC_API_URL so we can point at localhost in
 * dev and a deployed backend in prod without touching component code.
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

/**
 * Build a full URL from a path and an optional params object.
 *
 * - String / number values: included when non-empty.
 * - Array values: joined with a comma; skipped when empty. Matches the
 *   backend's csv query-param convention (e.g. `dietary=glutenFree,vegan`).
 * - null / undefined / empty-string / empty-array: skipped.
 */
function buildUrl(path, params) {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        if (value.length > 0) url.searchParams.set(key, value.join(","));
      } else if (String(value).trim() !== "") {
        url.searchParams.set(key, String(value).trim());
      }
    }
  }
  return url.toString();
}

/**
 * Fetch wrapper that throws a useful Error on non-2xx responses so callers
 * can rely on the returned promise resolving to parsed JSON on success.
 */
async function request(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    // Network / DNS / CORS-preflight failure — fetch itself rejected.
    throw new Error(`Network error contacting ${url}: ${err.message}`);
  }

  if (!res.ok) {
    // Try to surface the server's error message if it sent one.
    let details = "";
    try {
      const body = await res.json();
      details = body?.error?.message || body?.message || JSON.stringify(body);
    } catch {
      try {
        details = await res.text();
      } catch {
        details = "";
      }
    }
    const msg = `Request to ${url} failed with ${res.status} ${res.statusText}${
      details ? `: ${details}` : ""
    }`;
    const err = new Error(msg);
    // Attach the status so callers can branch on 404 vs. other failures
    // without string-matching the message.
    err.status = res.status;
    throw err;
  }

  return res.json();
}

/**
 * GET /api/restaurants with optional filters.
 * @param {{ name?: string, city?: string, state?: string, zip?: string }} [params]
 */
export function getRestaurants(params) {
  return request(buildUrl("/restaurants", params));
}

/**
 * GET /api/restaurants/:id
 * @param {string} id
 */
export function getRestaurantById(id) {
  return request(buildUrl(`/restaurants/${encodeURIComponent(id)}`));
}

// ────────────────────────────────────────────────────────────────────────────
// Authenticated requests
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the Authorization header for a backend request from a Clerk token.
 *
 * `getToken` is Clerk's `useAuth().getToken` — a function that returns a
 * fresh session JWT (or `null` if the user is signed out). We accept it as
 * an argument rather than importing Clerk here so api.js stays framework-
 * agnostic and callable from anywhere. Callers grab `getToken` in a client
 * component via `const { getToken } = useAuth()` and pass it in.
 *
 * Returns `{}` (no header) if no token is available so the backend can
 * respond with a clean 401 rather than a malformed request.
 */
export async function getAuthHeaders(getToken) {
  if (typeof getToken !== "function") return {};
  const token = await getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * GET /api/users/me — returns the DB User record for the current session.
 * Backend lazy-creates the row on first hit.
 * @param {() => Promise<string|null>} getToken from Clerk's useAuth()
 */
export async function getMe(getToken) {
  const headers = await getAuthHeaders(getToken);
  return request(buildUrl("/users/me"), { headers });
}
