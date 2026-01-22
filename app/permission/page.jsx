"use client";

import React, { useState, useEffect } from "react";
import SideBarLayout from "../components/Side_bar";

export default function RolesPermissionsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = "http://127.0.0.1:8000";

  function getAccessToken() {
    return typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    async function loadUsers() {
      try {
        const res = await fetch(`${API_BASE}/authapp/list_users/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.error("Failed to load users");
          return;
        }

        const data = await res.json();
        setUsers(data);
      } catch (e) {
        console.error("Error loading users:", e);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  function goCreateAccount() {
    window.location.href = "/permission/create";
  }

  function goCreateRole() {
    window.location.href = "/permission/roles/create";
  }

  async function handleEditUser(userId) {
    window.location.href = `/edit-user/${userId}`;
  }

  async function handleDeleteUser(userId) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/authapp/delete_user/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: userId }),
      });

      if (!res.ok) {
        console.error("Delete failed");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e) {
      console.error("Error deleting user:", e);
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

        <section className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="text-left text-sm text-gray-300">
                <th className="w-8/12 py-3 px-4">Username</th>
                <th className="w-2/12 py-3 px-4">Role</th>
                <th className="w-1/12 py-3 px-4 text-center">Actions</th>
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
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="bg-gray-700/30 border-t border-gray-700 hover:bg-gray-700/50 transition"
                  >
                    <td className="py-4 px-4">
                      <div className="font-medium text-white">{u.username}</div>
                      <div className="text-sm text-gray-400">{u.email}</div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-600 text-gray-200">
                        {u.role ?? "—"}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => handleEditUser(u.id)}
                          title="Edit"
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </SideBarLayout>
  );
}
