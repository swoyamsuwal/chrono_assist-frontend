"use client";

import React, { useEffect, useMemo, useState } from "react";
import SideBarLayout from "../components/Side_bar";

export default function RolesPermissionsPage() {
  const API_BASE = "http://127.0.0.1:8000";

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState("");

  // Inline edit state
  const [editingUserId, setEditingUserId] = useState(null);
  const [draftRoleId, setDraftRoleId] = useState("");

  function getAccessToken() {
    return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  }

  const rolesById = useMemo(() => {
    const m = new Map();
    for (const r of roles) m.set(r.id, r);
    return m;
  }, [roles]);

  async function loadUsers() {
    const token = getAccessToken();
    if (!token) return;

    const res = await fetch(`${API_BASE}/authapp/list_users/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
    const data = await res.json();
    setUsers(data);
  }

  async function loadRoles() {
    const token = getAccessToken();
    if (!token) return;

    const res = await fetch(`${API_BASE}/rbac/roles/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`Failed to load roles (${res.status})`);

    const data = await res.json();
    // If paginated: { results: [...] }
    const list = Array.isArray(data) ? data : data?.results || [];
    setRoles(list);
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

  function goCreateAccount() {
    window.location.href = "/permission/create";
  }

  function goCreateRole() {
    window.location.href = "/permission/roles/create";
  }

  // Instead of navigating to /edit-user/:id, we toggle inline editing
  function handleEditUser(user) {
    setEditingUserId(user.id);
    setDraftRoleId(user.role_id ?? ""); // preselect current role
  }

  function cancelEdit() {
    setEditingUserId(null);
    setDraftRoleId("");
  }

  async function saveRole(userId) {
    const token = getAccessToken();
    if (!token) return;

    if (!draftRoleId) {
      alert("Please select a role");
      return;
    }

    try {
      setError("");

      const res = await fetch(`${API_BASE}/authapp/users/${userId}/role/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role_id: Number(draftRoleId) }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          payload?.role_id?.[0] ||
          payload?.error ||
          `Role update failed (${res.status})`;
        throw new Error(msg);
      }

      // Update row locally (no page refresh)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role_id: payload.role_id ?? Number(draftRoleId),
                role:
                  payload.role ??
                  rolesById.get(Number(draftRoleId))?.name ??
                  u.role,
              }
            : u
        )
      );

      cancelEdit();
    } catch (e) {
      setError(e?.message || "Error updating role.");
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
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error || `Delete failed (${res.status})`);
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (editingUserId === userId) cancelEdit();
  } catch (e) {
    setError(e?.message || "Error deleting user.");
  }
}

  return (
    <SideBarLayout>
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>

          <div className="flex gap-3">
            <button
              onClick={goCreateRole}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
            >
              Create Role
            </button>

            <button
              onClick={goCreateAccount}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium"
            >
              Create New Account
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-900/40 border border-red-800 text-red-200 text-sm">
            {error}
          </div>
        )}

        <section className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="text-left text-sm text-gray-300">
                <th className="w-8/12 py-3 px-4">Username</th>
                <th className="w-2/12 py-3 px-4">Role</th>
                <th className="w-2/12 py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-gray-400">
                    No users found. Create your first account above.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isEditing = editingUserId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="bg-gray-700/30 border-t border-gray-700 hover:bg-gray-700/50 transition"
                    >
                      <td className="py-4 px-4">
                        <div className="font-medium text-white">{u.username}</div>
                        <div className="text-sm text-gray-400">{u.email}</div>
                      </td>

                      <td className="py-4 px-4">
                        {isEditing ? (
                          <select
                            className="w-full bg-gray-900 text-gray-100 border border-gray-700 rounded px-2 py-2"
                            value={draftRoleId}
                            onChange={(e) => setDraftRoleId(e.target.value)}
                            disabled={rolesLoading}
                          >
                            <option value="" disabled>
                              {rolesLoading ? "Loading roles..." : "Select role"}
                            </option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-600 text-gray-200">
                            {u.role ?? "—"}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveRole(u.id)}
                                title="Save"
                                className="px-3 py-2 rounded bg-green-600 hover:bg-green-500 transition text-white text-xs font-semibold disabled:opacity-60"
                                disabled={!draftRoleId}
                              >
                                Save
                              </button>

                              <button
                                onClick={cancelEdit}
                                title="Cancel"
                                className="px-3 py-2 rounded bg-gray-600 hover:bg-gray-500 transition text-white text-xs font-semibold"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditUser(u)}
                                title="Edit role"
                                className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 transition text-white"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>

                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                title="Delete"
                                className="p-2 rounded-full bg-red-600 hover:bg-red-500 transition text-white"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </div>
    </SideBarLayout>
  );
}
