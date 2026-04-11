"use client";

// ===============================================================
//  app/permission/page.jsx  (Permissions & Access Control page)
//  Displays all roles as cards + all users in a paginated table.
//  Allows admins to assign / change a user's role and email.
//
//  PERMISSION KEYS USED:
//    permission.create → show "Add User" + "Add Role" buttons
//    permission.update → show the edit (pencil) button per row
//
//  BACKEND ENDPOINTS:
//    GET   /authapp/list_users/          → fetch all users
//    GET   /rbac/roles/                  → fetch all roles with permissions
//    PATCH /authapp/users/:id/role/      → update a user's role + email
//                                          body: { role_id, email }
// ===============================================================

import React, { useEffect, useMemo, useState } from "react";
import SideBarLayout from "../components/Side_bar";
import { usePermissions } from "../hooks/usePermissions";

// ─── Table pagination ─────────────────────────────────────────────────────────
const PAGE_SIZE = 6; // ← change to show more/fewer users per page

// ─── Pagination ───────────────────────────────────────────────────────────────
// Renders prev / page-numbers / next controls below the users table.
// Returns null when there is only one page.
//
// Props:
//   page        — current page (1-based)
//   totalPages  — total number of pages
//   total       — total user count (used for the "1–6 of 24 users" label)
//   onChange(p) — called with the new page number
function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null;

  // Builds the page-number array with "…" ellipsis for large page counts.
  // e.g. totalPages=12, page=6 → [1, "…", 5, 6, 7, "…", 12]
  function getPages() {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 4) pages.push("…");
    const start = Math.max(2, page - 1);
    const end   = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 3) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  // Shared button class fragments composed per button state
  const btnBase     = "h-9 min-w-[36px] px-2 rounded-xl text-sm font-medium transition flex items-center justify-center";
  const btnActive   = "bg-indigo-600 text-white shadow-sm";
  const btnInactive = "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50";
  const btnDisabled = "bg-white border border-slate-200 text-slate-300 cursor-not-allowed";

  // Row range label e.g. "1–6 of 24 users"
  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-slate-100">
      {/* Left: item range indicator */}
      <span className="text-xs text-slate-500 tabular-nums">
        <span className="font-semibold text-slate-700">{rangeStart}–{rangeEnd}</span>
        {" "}of{" "}
        <span className="font-semibold text-slate-700">{total}</span> users
      </span>

      {/* Right: prev + numbered page buttons + next */}
      <div className="flex items-center gap-1.5">
        {/* Previous page */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={`${btnBase} ${page === 1 ? btnDisabled : btnInactive}`}
          aria-label="Previous page"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Page number buttons — "…" is non-interactive */}
        {getPages().map((p, idx) =>
          p === "…" ? (
            <span key={`ellipsis-${idx}`} className="h-9 w-9 flex items-center justify-center text-slate-400 text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`${btnBase} ${p === page ? btnActive : btnInactive}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next page */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} ${page === totalPages ? btnDisabled : btnInactive}`}
          aria-label="Next page"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Feature label + color maps ───────────────────────────────────────────────
// Used to render colored feature access tags on each role card.
// Keys must match the `feature` strings returned by GET /rbac/roles/.
// Add a new entry here whenever a new feature is introduced in the backend.
const FEATURE_LABELS = {
  tasks:      "Tasks",
  permission: "Permissions",
  files:      "Files",
  prompt:     "RAG Chat",
  mail:       "Mail",
  bulk_mail:  "Bulk Mail",
  calendar:   "Calendar",
};
const FEATURE_COLORS = {
  tasks:      "bg-indigo-50 text-indigo-700 ring-indigo-100",
  permission: "bg-violet-50 text-violet-700 ring-violet-100",
  files:      "bg-amber-50 text-amber-700 ring-amber-100",
  prompt:     "bg-emerald-50 text-emerald-700 ring-emerald-100",
  mail:       "bg-blue-50 text-blue-700 ring-blue-100",
  bulk_mail:  "bg-cyan-50 text-cyan-700 ring-cyan-100",
  calendar:   "bg-rose-50 text-rose-700 ring-rose-100",
};

// ================================================================
//  Page component: RolesPermissionsPage
//
//  Layout structure:
//    <page header>         ← title + "Add User" button (canCreate)
//    <roles section>       ← "Add Role" button + horizontal card strip
//    <users table>         ← paginated, with inline edit per row (canUpdate)
//
//  State overview:
//    users / roles         — fetched in parallel on mount
//    loading / rolesLoading— separate flags so the role skeleton and user
//                            table skeleton can render independently
//    editingUserId         — id of the row currently in edit mode (or null)
//    draftRoleId / draftEmail — controlled inputs for the active edit row
//    page                  — current pagination page (1-based)
// ================================================================
export default function RolesPermissionsPage() {
  const API_BASE = "http://127.0.0.1:8000";

  // ── Permission gates ──────────────────────────────────────────
  const { hasPermission, loading: permLoading } = usePermissions();

  const canCreate = hasPermission("permission", "create"); // show Add User + Add Role
  const canUpdate = hasPermission("permission", "update"); // show edit pencil per row

  // ── Data state ────────────────────────────────────────────────
  const [users, setUsers]               = useState([]);
  const [roles, setRoles]               = useState([]);
  const [loading, setLoading]           = useState(true);      // true during users fetch
  const [rolesLoading, setRolesLoading] = useState(true);      // true during roles fetch
  const [error, setError]               = useState("");        // global error banner

  // ── Inline row edit state ─────────────────────────────────────
  // Only one row can be in edit mode at a time.
  // editingUserId is the id of the row being edited, or null when none.
  const [editingUserId, setEditingUserId] = useState(null);
  const [draftRoleId, setDraftRoleId]     = useState("");      // role <select> value
  const [draftEmail, setDraftEmail]       = useState("");      // email <input> value

  // ── Pagination ────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));

  // Re-slice only when users or page changes — no re-fetch needed
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, page]);

  // Clamps page to valid range — called by the Pagination component
  function handlePageChange(p) {
    setPage(Math.min(Math.max(1, p), totalPages));
  }

  // Reads JWT from localStorage — safe to call on every request
  function getAccessToken() {
    return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  }

  // ── Derived lookup maps ───────────────────────────────────────

  // Map<roleId, roleObject> — used in saveUser() to look up the role name
  // after a PATCH so we can update the row locally without re-fetching.
  const rolesById = useMemo(() => {
    const m = new Map();
    for (const r of roles) m.set(r.id, r);
    return m;
  }, [roles]);

  // Map<roleId, count> — counts how many users have each role.
  // Displayed as the "N users" pill on each role card.
  const usersCountByRoleId = useMemo(() => {
    const m = new Map();
    for (const u of users) {
      const rid = u?.role_id;
      if (rid == null) continue;
      m.set(rid, (m.get(rid) || 0) + 1);
    }
    return m;
  }, [users]);

  // ── API fetchers ──────────────────────────────────────────────

  // Fetches the full user list and stores it in state.
  async function loadUsers() {
    const token = getAccessToken();
    if (!token) return;
    const res = await fetch(`${API_BASE}/authapp/list_users/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
    setUsers(await res.json());
  }

  // Fetches the full roles list (including permissions per role if the API provides them).
  // The API may return a plain array or a DRF paginated { results: [...] } shape — both handled.
  async function loadRoles() {
    const token = getAccessToken();
    if (!token) return;
    const res = await fetch(`${API_BASE}/rbac/roles/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to load roles (${res.status})`);
    const data = await res.json();
    setRoles(Array.isArray(data) ? data : data?.results || []);
  }

  // ── Mount: load users + roles in parallel ─────────────────────
  // Both requests run concurrently via Promise.all to minimise total wait time.
  // If the user is not logged in, an error is shown immediately without fetching.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      setRolesLoading(false);
      setError("No access token. Please login.");
      return;
    }
    (async () => {
      try {
        setError("");
        setLoading(true);
        setRolesLoading(true);
        await Promise.all([loadUsers(), loadRoles()]);
      } catch (e) {
        setError(e?.message || "Failed to load data.");
      } finally {
        setLoading(false);
        setRolesLoading(false);
      }
    })();
  }, []);

  // ── Navigation helpers ────────────────────────────────────────
  // Using window.location.href instead of router.push so the full page
  // reloads and picks up any server-side session state on the create pages.
  function goCreateAccount() { window.location.href = "/permission/create"; }
  function goCreateRole()    { window.location.href = "/permission/roles/create"; }

  // ── Inline row edit helpers ───────────────────────────────────

  // Opens edit mode for a row — pre-fills the draft inputs with the user's
  // current role and email so the user sees the existing values immediately.
  function handleEditUser(user) {
    setEditingUserId(user.id);
    setDraftRoleId(user.role_id ?? "");
    setDraftEmail(user.email ?? "");
  }

  // Closes edit mode without saving — restores the row to read-only display.
  function cancelEdit() {
    setEditingUserId(null);
    setDraftRoleId("");
    setDraftEmail("");
  }

  // PATCHes the user's role and email, then updates the row in local state
  // immediately so the UI reflects the change without a full re-fetch.
  // Error messages are extracted from the API response in priority order:
  //   email field error → role_id field error → generic error → status code fallback
  async function saveUser(userId) {
    const token = getAccessToken();
    if (!token) return;
    if (!draftRoleId) { alert("Please select a role"); return; }

    try {
      setError("");
      const res = await fetch(`${API_BASE}/authapp/users/${userId}/role/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role_id: Number(draftRoleId),
          email: draftEmail.trim(),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          payload?.email?.[0]   ||  // DRF field-level validation error for email
          payload?.role_id?.[0] ||  // DRF field-level validation error for role_id
          payload?.error        ||
          `Update failed (${res.status})`
        );
      }

      // Update only the edited row in local state.
      // Prefer values from the API response; fall back to the draft inputs
      // in case the backend returns a minimal response body.
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role_id: payload.role_id ?? Number(draftRoleId),
                role:    payload.role    ?? rolesById.get(Number(draftRoleId))?.name ?? u.role,
                email:   (payload.email  ?? draftEmail.trim()) || u.email,
              }
            : u
        )
      );
      cancelEdit(); // close the edit row on success
    } catch (e) {
      setError(e?.message || "Error updating user.");
    }
  }

  // ── Display helpers ───────────────────────────────────────────

  // Generates a 1-2 character avatar initials string from a username or email.
  // Splits on whitespace, @, ., _, - to find word boundaries.
  // e.g. "john_doe" → "JD", "alice@example.com" → "AE", "" → "U"
  function initialsFrom(value) {
    const s = String(value || "").trim();
    if (!s) return "U";
    const parts = s.split(/[\s@._-]+/).filter(Boolean);
    return (
      (parts[0]?.[0] || "U").toUpperCase() +
      (parts[1]?.[0] || "").toUpperCase()
    );
  }

  // Returns a Tailwind color class for the role pill based on the role name.
  // Falls back to a neutral slate style for unrecognised role names.
  function roleTone(roleName) {
    const n = String(roleName || "").toLowerCase();
    if (n.includes("admin"))   return "bg-indigo-50 text-indigo-700 ring-indigo-100";
    if (n.includes("manager")) return "bg-violet-50 text-violet-700 ring-violet-100";
    if (n.includes("member"))  return "bg-blue-50 text-blue-700 ring-blue-100";
    return "bg-slate-50 text-slate-700 ring-slate-100";
  }

  // Returns a Tailwind color class for the status pill.
  // "active" → green; anything else → neutral slate.
  function statusTone(status) {
    return String(status || "").toLowerCase().includes("active")
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : "bg-slate-100 text-slate-600 ring-slate-200";
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <SideBarLayout>
      <div className="w-full">

        {/* ── Page header: title + "Add User" button ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              Permissions & Access Control
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage roles and user permissions
            </p>
          </div>
          {/* Only shown for users with permission.create */}
          {canCreate && (
            <button
              onClick={goCreateAccount}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path d="M15 19c0-1.657-2.239-3-5-3s-5 1.343-5 3v1h10v-1Z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Add User
            </button>
          )}
        </div>

        {/* Global error banner — appears when any fetch or save fails */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Roles section header: "Roles" title + "Add Role" button ── */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-slate-900">Roles</div>
            <div className="mt-1 text-sm text-slate-500">
              Assign what each user can do in your system
            </div>
          </div>
          {canCreate && (
            <button
              onClick={goCreateRole}
              className="shrink-0 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              Add Role
            </button>
          )}
        </div>

        {/* ── Role cards — horizontally scrollable strip ── */}
        {rolesLoading ? (
          // Skeleton row shown while roles are being fetched
          <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-2xl bg-slate-100 animate-pulse" />
                  <div className="h-5 w-14 bg-slate-100 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-28 bg-slate-100 rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-slate-100 rounded animate-pulse mb-3" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-14 bg-slate-100 rounded-lg animate-pulse" />
                  <div className="h-5 w-12 bg-slate-100 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>

        ) : roles.length === 0 ? (
          // Empty state — shown when no roles exist yet
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 mb-6 text-sm text-slate-500">
            No roles yet. Click <strong className="text-slate-700 font-semibold">Add Role</strong> to create one.
          </div>

        ) : (
          // Horizontally scrollable card strip.
          // -mx-1 + px-1 keeps card box-shadows visible at the left/right scroll edges.
          <div className="flex gap-4 mb-6 overflow-x-auto pb-3 -mx-1 px-1">
            {roles.map((r) => {
              const userCount = usersCountByRoleId.get(r.id) || 0;

              // The permissions array ([{ feature, action }, ...]) may or may not be
              // returned by the API depending on the serializer — guard with fallback.
              const perms      = Array.isArray(r.permissions) ? r.permissions : [];
              // Unique feature names for this role — used to render feature access tags
              const featureSet = [...new Set(perms.map((p) => p.feature))];

              return (
                <div
                  key={r.id}
                  className="flex-shrink-0 w-64 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col gap-3"
                >
                  {/* Shield icon + user count pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center text-indigo-600 flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                        <path d="M12 3 20 7v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4Z"
                          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 whitespace-nowrap">
                      {userCount} {userCount === 1 ? "user" : "users"}
                    </span>
                  </div>

                  {/* Role name + total permission count */}
                  <div>
                    <div className="text-base font-semibold text-slate-900 capitalize">{r.name}</div>
                    {/* Only shown when the API returns the permissions array */}
                    {perms.length > 0 && (
                      <div className="mt-0.5 text-xs text-slate-400">
                        {perms.length} permission{perms.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>

                  {/* Feature access tags — one coloured pill per unique feature.
                      The entire block is omitted when the API doesn't return permissions
                      so no empty whitespace appears on the card.                         */}
                  {featureSet.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {featureSet.map((f) => (
                        <span
                          key={f}
                          className={[
                            "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1",
                            FEATURE_COLORS[f] || "bg-slate-50 text-slate-600 ring-slate-200",
                          ].join(" ")}
                        >
                          {FEATURE_LABELS[f] || f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Team Members table ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Table header bar: title + total user count */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="text-base font-semibold text-slate-900">Team Members</div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {users.length} total users
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-3 px-5">Name</th>
                  <th className="py-3 px-5">Email</th>
                  <th className="py-3 px-5">Role</th>
                  <th className="py-3 px-5">Status</th>
                  {/* Actions column only rendered for users with permission.update */}
                  {canUpdate && (
                    <th className="py-3 px-5 text-right">Actions</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* Loading state — shown while fetch or permission resolution is in flight */}
                {loading || permLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-5 text-sm text-slate-500">
                      Loading...
                    </td>
                  </tr>

                ) : users.length === 0 ? (
                  // Empty state
                  <tr>
                    <td colSpan={5} className="py-10 px-5 text-sm text-slate-500">
                      No users found. Create your first account above.
                    </td>
                  </tr>

                ) : (
                  // ── User rows (current page only) ──
                  pagedUsers.map((u) => {
                    const isEditing = editingUserId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition">

                        {/* Name: avatar (photo or initials) + username + type label */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-600 text-white grid place-items-center text-xs font-semibold overflow-hidden flex-shrink-0">
                              {u.profile_picture_url ? (
                                // Profile photo when available
                                <img
                                  src={u.profile_picture_url}
                                  alt={u.username || u.email || "User"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                // Fall back to initials generated from username or email
                                initialsFrom(u.username || u.email)
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {u.username || u.email || "—"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {u.username ? "User" : "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email: editable input in edit mode, plain text in read mode */}
                        <td className="py-4 px-5">
                          {isEditing ? (
                            <input
                              type="email"
                              value={draftEmail}
                              onChange={(e) => setDraftEmail(e.target.value)}
                              placeholder="user@example.com"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                            />
                          ) : (
                            <span className="text-sm text-slate-700">{u.email || "—"}</span>
                          )}
                        </td>

                        {/* Role: role <select> in edit mode, coloured pill in read mode */}
                        <td className="py-4 px-5">
                          {isEditing ? (
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                              value={draftRoleId}
                              onChange={(e) => setDraftRoleId(e.target.value)}
                              disabled={rolesLoading} // disable while roles are still loading
                            >
                              <option value="" disabled>
                                {rolesLoading ? "Loading roles..." : "Select role"}
                              </option>
                              {roles.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={["inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1", roleTone(u.role ?? "")].join(" ")}>
                              {u.role ?? "—"}
                            </span>
                          )}
                        </td>

                        {/* Status: coloured pill (Active → green, anything else → slate) */}
                        <td className="py-4 px-5">
                          <span className={["inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1", statusTone(u.status ?? "Active")].join(" ")}>
                            {u.status ?? "Active"}
                          </span>
                        </td>

                        {/* Actions: Save + Cancel in edit mode, pencil icon in read mode */}
                        {canUpdate && (
                          <td className="py-4 px-5">
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  {/* Save — disabled until a role is selected */}
                                  <button
                                    onClick={() => saveUser(u.id)}
                                    disabled={!draftRoleId}
                                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                                  >
                                    Save
                                  </button>
                                  {/* Cancel — closes edit mode without saving */}
                                  <button
                                    onClick={cancelEdit}
                                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 transition"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                // Pencil icon button — opens edit mode for this row
                                <button
                                  onClick={() => handleEditUser(u)}
                                  title="Edit user"
                                  className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition grid place-items-center"
                                >
                                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                                    <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
                                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination — rendered below the table, hidden during loading */}
          {!loading && !permLoading && users.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={users.length}
              onChange={handlePageChange}
            />
          )}

          {/* Bottom padding spacer */}
          <div className="px-5 py-2 bg-white" />
        </div>
      </div>
    </SideBarLayout>
  );
}