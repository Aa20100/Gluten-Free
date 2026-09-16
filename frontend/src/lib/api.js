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

// ── Favorites ────────────────────────────────────────────────────────────

/** GET /api/users/me/favorites → populated Restaurant[]. */
export async function getFavorites(getToken) {
  const headers = await getAuthHeaders(getToken);
  return request(buildUrl("/users/me/favorites"), { headers });
}

/** POST /api/users/me/favorites/:restaurantId → updated favorites (populated). */
export async function addFavorite(getToken, restaurantId) {
  const headers = await getAuthHeaders(getToken);
  return request(
    buildUrl(`/users/me/favorites/${encodeURIComponent(restaurantId)}`),
    { method: "POST", headers }
  );
}

/** DELETE /api/users/me/favorites/:restaurantId → updated favorites (populated). */
export async function removeFavorite(getToken, restaurantId) {
  const headers = await getAuthHeaders(getToken);
  return request(
    buildUrl(`/users/me/favorites/${encodeURIComponent(restaurantId)}`),
    { method: "DELETE", headers }
  );
}

// ── Reviews ──────────────────────────────────────────────────────────────

/** GET /api/reviews/restaurant/:id → Review[] (public), populated with user.name. */
export function getReviewsForRestaurant(restaurantId) {
  return request(
    buildUrl(`/reviews/restaurant/${encodeURIComponent(restaurantId)}`)
  );
}

/** GET /api/reviews/me → Review[] (authed), populated with restaurant.name/address/imageUrl. */
export async function getMyReviews(getToken) {
  const headers = await getAuthHeaders(getToken);
  return request(buildUrl("/reviews/me"), { headers });
}

/** POST /api/reviews → the created Review, populated. */
export async function createReview(getToken, { restaurant, rating, text }) {
  const headers = {
    ...(await getAuthHeaders(getToken)),
    "Content-Type": "application/json",
  };
  return request(buildUrl("/reviews"), {
    method: "POST",
    headers,
    body: JSON.stringify({ restaurant, rating, text }),
  });
}

/** PUT /api/reviews/:id → the updated Review, populated. */
export async function updateReview(getToken, id, { rating, text }) {
  const headers = {
    ...(await getAuthHeaders(getToken)),
    "Content-Type": "application/json",
  };
  const body = {};
  if (rating !== undefined) body.rating = rating;
  if (text !== undefined) body.text = text;
  return request(buildUrl(`/reviews/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
}

/** DELETE /api/reviews/:id → 204 (no content). */
export async function deleteReview(getToken, id) {
  const headers = await getAuthHeaders(getToken);
  // No JSON to parse on a 204 — use fetch directly and only check status.
  const url = buildUrl(`/reviews/${encodeURIComponent(id)}`);
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok) {
    const err = new Error(`Delete review failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return true;
}

// ── Posts ────────────────────────────────────────────────────────────────

/**
 * GET /api/posts — paginated feed.
 * @param {{ category?: string, tag?: string, q?: string,
 *           sort?: "recent"|"popular", page?: number, limit?: number }} params
 * @returns {Promise<{ posts, total, page, limit, pageCount }>}
 */
export function getPosts(params) {
  return request(buildUrl("/posts", params));
}

/** GET /api/posts/:id — public. */
export function getPostById(id) {
  return request(buildUrl(`/posts/${encodeURIComponent(id)}`));
}

/**
 * Turn a post payload into a multipart FormData body the backend can
 * parse with multer. File objects go under `images`; simple scalars go
 * raw; `tags` is joined into a csv (backend re-splits); `imageUrls`
 * (URLs kept from a previous edit) is JSON-stringified.
 *
 * Non-file fields must all be strings on FormData — the browser rejects
 * arrays / objects otherwise. The backend's normalizePostBody
 * middleware un-stringifies these before validation.
 */
function postToFormData({ title, body, category, tags, imageUrls, files }) {
  const form = new FormData();
  if (title !== undefined) form.append("title", title);
  if (body !== undefined) form.append("body", body);
  if (category !== undefined) form.append("category", category);
  if (Array.isArray(tags)) form.append("tags", tags.join(","));
  if (Array.isArray(imageUrls)) form.append("imageUrls", JSON.stringify(imageUrls));
  for (const file of files || []) form.append("images", file, file.name);
  return form;
}

/**
 * Fetch that lets FormData set its own Content-Type (with the required
 * multipart boundary) instead of forcing JSON headers.
 */
async function requestForm(url, { method, headers, body }) {
  let res;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (err) {
    throw new Error(`Network error contacting ${url}: ${err.message}`);
  }
  if (!res.ok) {
    let details = "";
    try {
      const j = await res.json();
      details = j?.error?.message || j?.message || JSON.stringify(j);
    } catch {
      try { details = await res.text(); } catch {}
    }
    const err = new Error(
      `Request to ${url} failed with ${res.status} ${res.statusText}${details ? `: ${details}` : ""}`
    );
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * POST /api/posts — authed. Payload may include `files: File[]`; when
 * present, the request is sent as multipart/form-data. Otherwise it goes
 * as JSON.
 *
 * Signature is `(payload, getToken)` to match the Class 9 spec; note the
 * earlier reviews wrappers use the reverse order (`getToken` first).
 */
export async function createPost(payload, getToken) {
  const hasFiles = Array.isArray(payload.files) && payload.files.length > 0;
  const authHeaders = await getAuthHeaders(getToken);

  if (hasFiles) {
    // Do NOT set Content-Type — the browser fills in the multipart
    // boundary automatically. Pre-setting it here would break parsing.
    return requestForm(buildUrl("/posts"), {
      method: "POST",
      headers: authHeaders,
      body: postToFormData(payload),
    });
  }

  return request(buildUrl("/posts"), {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** PUT /api/posts/:id — authed. Partial update. Same JSON-or-multipart rule. */
export async function updatePost(id, payload, getToken) {
  const hasFiles = Array.isArray(payload.files) && payload.files.length > 0;
  const authHeaders = await getAuthHeaders(getToken);
  const url = buildUrl(`/posts/${encodeURIComponent(id)}`);

  if (hasFiles) {
    return requestForm(url, {
      method: "PUT",
      headers: authHeaders,
      body: postToFormData(payload),
    });
  }

  return request(url, {
    method: "PUT",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/posts/:id — authed → 204. */
export async function deletePost(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const url = buildUrl(`/posts/${encodeURIComponent(id)}`);
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok) {
    const err = new Error(`Delete post failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return true;
}

/** GET /api/posts/me — authed. */
export async function getMyPosts(getToken) {
  const headers = await getAuthHeaders(getToken);
  return request(buildUrl("/posts/me"), { headers });
}

// ── Post voting + moderation ─────────────────────────────────────────────

/** POST /api/posts/:id/vote — authed. direction: "up" | "down" | "clear". */
export async function votePost(id, direction, getToken) {
  const headers = {
    ...(await getAuthHeaders(getToken)),
    "Content-Type": "application/json",
  };
  return request(buildUrl(`/posts/${encodeURIComponent(id)}/vote`), {
    method: "POST",
    headers,
    body: JSON.stringify({ direction }),
  });
}

/** POST /api/posts/:id/pin — moderator only. Toggle. */
export async function pinPost(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  return request(buildUrl(`/posts/${encodeURIComponent(id)}/pin`), {
    method: "POST",
    headers,
  });
}

/** POST /api/posts/:id/lock — moderator only. Toggle. */
export async function lockPost(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  return request(buildUrl(`/posts/${encodeURIComponent(id)}/lock`), {
    method: "POST",
    headers,
  });
}

/** DELETE /api/posts/:id/moderate — moderator only. 204. */
export async function moderatorDeletePost(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const url = buildUrl(`/posts/${encodeURIComponent(id)}/moderate`);
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok) {
    const err = new Error(`Moderator delete failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return true;
}

// ── Comments ─────────────────────────────────────────────────────────────

/** GET /api/comments/post/:postId — public. Flat, oldest-first. */
export function getComments(postId) {
  return request(buildUrl(`/comments/post/${encodeURIComponent(postId)}`));
}

/** POST /api/comments — authed. Payload: { post, body, parent? }. */
export async function createComment(payload, getToken) {
  const headers = {
    ...(await getAuthHeaders(getToken)),
    "Content-Type": "application/json",
  };
  return request(buildUrl("/comments"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

/** PUT /api/comments/:id — authed + author only. Partial. */
export async function updateComment(id, payload, getToken) {
  const headers = {
    ...(await getAuthHeaders(getToken)),
    "Content-Type": "application/json",
  };
  return request(buildUrl(`/comments/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/comments/:id — authed + author only. Soft-delete; returns redacted doc. */
export async function deleteComment(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  const url = buildUrl(`/comments/${encodeURIComponent(id)}`);
  const res = await fetch(url, { method: "DELETE", headers });
  if (!res.ok) {
    const err = new Error(`Delete comment failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** POST /api/comments/:id/like — authed. Toggle. Returns doc + likeCount + likedByMe. */
export async function likeComment(id, getToken) {
  const headers = await getAuthHeaders(getToken);
  return request(buildUrl(`/comments/${encodeURIComponent(id)}/like`), {
    method: "POST",
    headers,
  });
}

// ── Reports ──────────────────────────────────────────────────────────────

/** POST /api/reports — authed. Payload: { targetType, targetId, reason }. */
export async function reportContent(payload, getToken) {
  const headers = {
    ...(await getAuthHeaders(getToken)),
    "Content-Type": "application/json",
  };
  return request(buildUrl("/reports"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

/** GET /api/reports — moderator only. */
export async function listReports(getToken) {
  const headers = await getAuthHeaders(getToken);
  return request(buildUrl("/reports"), { headers });
}
