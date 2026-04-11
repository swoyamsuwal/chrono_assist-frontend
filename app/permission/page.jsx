"use client";

import React, { useEffect, useMemo, useState } from "react";
import SideBarLayout from "../components/Side_bar";
import { usePermissions } from "../hooks/usePermissions";

const PAGE_SIZE = 6; // ← change to show more/fewer users per page

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null;

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

  const btnBase     = "h-9 min-w-[36px] px-2 rounded-xl text-sm font-medium transition flex items-center justify-center";
  const btnActive   = "bg-indigo-600 text-white shadow-sm";
  const btnInactive = "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50";
  const btnDisabled = "bg-white border border-slate-200 text-slate-300 cursor-not-allowed";

  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-slate-100">
      <span className="text-xs text-slate-500 tabular-nums">
        <span className="font-semibold text-slate-700">{rangeStart}–{rangeEnd}</span>
        {" "}of{" "}
        <span className="font-semibold text-slate-700">{total}</span> users
      </span>

      <div className="flex items-center gap-1.5">
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

export default function RolesPermissionsPage() {
  const API_BASE = "http://127.0.0.1:8000";

  const { hasPermission, loading: permLoading } = usePermissions();

  const canCreate = hasPermission("permission", "create");
  const canUpdate = hasPermission("permission", "update");
  const canDelete = hasPermission("permission", "delete");

  const [users, setUsers]                   = useState([]);
  const [roles, setRoles]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [rolesLoading, setRolesLoading]     = useState(true);
  const [error, setError]                   = useState("");

  const [editingUserId, setEditingUserId]   = useState(null);
  const [draftRoleId, setDraftRoleId]       = useState("");
  const [draftEmail, setDraftEmail]         = useState("");

  // ── pagination ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, page]);

  function handlePageChange(p) {
    setPage(Math.min(Math.max(1, p), totalPages));
  }

  function getAccessToken() {
    return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  }

  const rolesById = useMemo(() => {
    const m = new Map();
    for (const r of roles) m.set(r.id, r);
    return m;
  }, [roles]);

  const usersCountByRoleId = useMemo(() => {
    const m = new Map();
    for (const u of users) {
      const rid = u?.role_id;
      if (rid == null) continue;
      m.set(rid, (m.get(rid) || 0) + 1);
    }
    return m;
  }, [users]);

  async function loadUsers() {
    const token = getAccessToken();
    if (!token) return;
    const res = await fetch(`${API_BASE}/authapp/list_users/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
    setUsers(await res.json());
  }

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

  function goCreateAccount() { window.location.href = "/permission/create"; }
  function goCreateRole()    { window.location.href = "/permission/roles/create"; }

  function handleEditUser(user) {
    setEditingUserId(user.id);
    setDraftRoleId(user.role_id ?? "");
    setDraftEmail(user.email ?? "");
  }

  function cancelEdit() {
    setEditingUserId(null);
    setDraftRoleId("");
    setDraftEmail("");
  }

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
          payload?.email?.[0] ||
          payload?.role_id?.[0] ||
          payload?.error ||
          `Update failed (${res.status})`
        );
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role_id: payload.role_id ?? Number(draftRoleId),
                role: payload.role ?? rolesById.get(Number(draftRoleId))?.name ?? u.role,
                email: (payload.email ?? draftEmail.trim()) || u.email,
              }
            : u
        )
      );
      cancelEdit();
    } catch (e) {
      setError(e?.message || "Error updating user.");
    }
  }

  async function handleDeleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const token = getAccessToken();
    if (!token) return;

    try {
      setError("");
      const res = await fetch(`${API_BASE}/authapp/users/${userId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Delete failed (${res.status})`);
      }
      setUsers((prev) => {
        const next = prev.filter((u) => u.id !== userId);
        const newTotal = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
        setPage((p) => Math.min(p, newTotal));
        return next;
      });
      if (editingUserId === userId) cancelEdit();
    } catch (e) {
      setError(e?.message || "Error deleting user.");
    }
  }

  function initialsFrom(value) {
    const s = String(value || "").trim();
    if (!s) return "U";
    const parts = s.split(/[\s@._-]+/).filter(Boolean);
    return (
      (parts[0]?.[0] || "U").toUpperCase() +
      (parts[1]?.[0] || "").toUpperCase()
    );
  }

  function roleTone(roleName) {
    const n = String(roleName || "").toLowerCase();
    if (n.includes("admin"))   return "bg-indigo-50 text-indigo-700 ring-indigo-100";
    if (n.includes("manager")) return "bg-violet-50 text-violet-700 ring-violet-100";
    if (n.includes("member"))  return "bg-blue-50 text-blue-700 ring-blue-100";
    return "bg-slate-50 text-slate-700 ring-slate-100";
  }

  function statusTone(status) {
    return String(status || "").toLowerCase().includes("active")
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : "bg-slate-100 text-slate-600 ring-slate-200";
  }

  return (
    <SideBarLayout>
      <div className="w-full">

        {/* PAGE HEADER */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              Permissions & Access Control
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage roles and user permissions
            </p>
          </div>

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

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ROLES HEADER */}
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

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          {rolesLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-4 w-32 bg-slate-100 rounded mb-4" />
                <div className="h-6 w-40 bg-slate-100 rounded mb-3" />
                <div className="h-3 w-28 bg-slate-100 rounded" />
              </div>
            ))
          ) : roles.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
              No roles found.
            </div>
          ) : (
            roles.slice(0, 4).map((r) => {
              const count = usersCountByRoleId.get(r.id) || 0;
              return (
                <div
                  key={r.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center text-indigo-700">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                        <path d="M12 3 20 7v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4Z"
                          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {count} users
                    </span>
                  </div>
                  <div className="mt-4 text-lg font-semibold text-slate-900">{r.name}</div>
                  <div className="mt-2 text-sm text-slate-500 line-clamp-2">
                    {r.description || "—"}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Team Members table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
                  {(canUpdate || canDelete) && (
                    <th className="py-3 px-5 text-right">Actions</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading || permLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-5 text-sm text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 px-5 text-sm text-slate-500">
                      No users found. Create your first account above.
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((u) => {
                    const isEditing = editingUserId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition">

                        {/* Name */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-600 text-white grid place-items-center text-xs font-semibold overflow-hidden flex-shrink-0">
                              {u.profile_picture_url ? (
                                <img
                                  src={u.profile_picture_url}
                                  alt={u.username || u.email || "User"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
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

                        {/* Email */}
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

                        {/* Role */}
                        <td className="py-4 px-5">
                          {isEditing ? (
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                              value={draftRoleId}
                              onChange={(e) => setDraftRoleId(e.target.value)}
                              disabled={rolesLoading}
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

                        {/* Status */}
                        <td className="py-4 px-5">
                          <span className={["inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1", statusTone(u.status ?? "Active")].join(" ")}>
                            {u.status ?? "Active"}
                          </span>
                        </td>

                        {/* Actions */}
                        {(canUpdate || canDelete) && (
                          <td className="py-4 px-5">
                            <div className="flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => saveUser(u.id)}
                                    disabled={!draftRoleId}
                                    className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200 transition"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  {canUpdate && (
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
                                  {canDelete && (
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      title="Delete"
                                      className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition grid place-items-center"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                                        <path d="M4 7h16M10 11v6m4-6v6M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"
                                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                  )}
                                </>
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

          {/* Pagination — below the table, above the bottom padding */}
          {!loading && !permLoading && users.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={users.length}
              onChange={handlePageChange}
            />
          )}

          <div className="px-5 py-2 bg-white" />
        </div>
      </div>
    </SideBarLayout>
  );
}