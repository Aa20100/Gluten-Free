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
 * Build a full URL from a path and an optional params object. Only entries
 * whose value is a non-empty string are included in the query string.
 */
function buildUrl(path, params) {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null && String(value).trim() !== "") {
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
