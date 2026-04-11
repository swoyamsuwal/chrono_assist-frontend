// ===============================================================
//  app/lib/api.js
//  Central HTTP utility for all backend requests.
//
//  EXPORTS:
//    API_BASE       → base URL string (used outside apiFetch when building URLs manually)
//    getAccessToken → reads the JWT from localStorage (safe for SSR)
//    apiFetch       → authenticated JSON fetch wrapper used everywhere in the app
//
//  USAGE:
//    import { apiFetch } from "../lib/api";
//    const data = await apiFetch("/api/tasks/tasks/board/");
//    const data = await apiFetch("/rbac/roles/", { method: "POST", body: { name: "Admin" } });
// ===============================================================

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Reads from the NEXT_PUBLIC_API_BASE environment variable so the same code
// works in development (localhost:8000) and production (real domain).
// Falls back to localhost if the variable is not set.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

// ─── getAccessToken ───────────────────────────────────────────────────────────
// Safely reads the JWT access token that was stored in localStorage at login.
// Returns null during SSR (window is undefined) so Next.js server-side code
// never throws a ReferenceError when importing this module.
export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

// ─── apiFetch ────────────────────────────────────────────────────────────────
// Thin wrapper around the native fetch() that:
//   1. Prepends API_BASE to every path  (e.g. "/api/tasks/" → "http://…/api/tasks/")
//   2. Attaches the JWT Authorization header automatically if a token exists
//   3. Serialises the body to JSON and sets Content-Type when a body is provided
//   4. Parses the JSON response (silently skips non-JSON responses like 204 No Content)
//   5. Throws a typed Error on non-2xx responses with a human-readable message
//      extracted from the API's own error payload, so callers can show it directly
//
// Parameters:
//   path     — URL path relative to API_BASE (must start with "/")
//   method   — HTTP verb, defaults to "GET"
//   body     — plain JS object; serialised to JSON automatically
//   headers  — any extra headers to merge in (override defaults if keys clash)
//
// Throws:
//   Error with .message  → human-readable string from the API response or a fallback
//         .status        → HTTP status code (e.g. 401, 404, 500)
//         .data          → full parsed response body (for callers that need more detail)
export async function apiFetch(path, { method = "GET", body, headers } = {}) {
  const token = getAccessToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      // Only set Content-Type when there is a body to send
      ...(body  ? { "Content-Type": "application/json" } : {}),
      // Only set Authorization when a token is available (unauthenticated requests still work)
      ...(token ? { Authorization: `Bearer ${token}` }  : {}),
      // Caller-supplied headers last so they can override the defaults above
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Attempt to parse as JSON regardless of status code.
  // This lets us read the error payload on non-2xx responses too.
  // If the response has no body (e.g. 204 No Content), data stays null.
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response — data remains null, which is fine for DELETE 204 etc.
  }

  // ── Error handling ────────────────────────────────────────────
  // Django REST Framework returns errors in several shapes depending on the view:
  //   { detail: "..." }        — DRF default authentication/permission errors
  //   { error: "..." }         — custom views in this project
  //   "plain string"           — rare, but guard for it anyway
  // We pick the first non-empty value and attach it to the thrown Error so
  // every caller can do: catch (e) { setError(e.message) } without extra parsing.
  if (!res.ok) {
    const msg =
      data?.detail ||
      data?.error  ||
      (typeof data === "string" ? data : null) ||
      `Request failed (${res.status})`; // final fallback

    const err    = new Error(msg);
    err.status   = res.status; // lets callers branch on 401 vs 403 vs 500
    err.data     = data;       // full payload available if the caller needs it
    throw err;
  }

  // Return the parsed response body on success.
  // Callers receive the data directly — no need to call .json() themselves.
  return data;
}