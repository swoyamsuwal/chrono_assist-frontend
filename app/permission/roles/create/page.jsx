"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SideBarLayout from "../../../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000";

function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

// Backend-compatible permissions (ONLY use values your backend choices already allow)
const PERMISSIONS_UI = [
  // Tasks
  { label: "Tasks: View", feature: "tasks", action: "view" },
  { label: "Tasks: Create", feature: "tasks", action: "create" },
  { label: "Tasks: Update", feature: "tasks", action: "update" },
  { label: "Tasks: Delete", feature: "tasks", action: "delete" },

  // Permission module (single feature controls roles/accounts in your current backend)
  { label: "Permission: View", feature: "permission", action: "view" },
  { label: "Permission: Create (roles/accounts)", feature: "permission", action: "create" },
  { label: "Permission: Update (roles/accounts)", feature: "permission", action: "update" },
  { label: "Permission: Delete (roles/accounts)", feature: "permission", action: "delete" },

  // Files
  { label: "Files: View", feature: "files", action: "view" },
  { label: "Files: Upload", feature: "files", action: "create" },
  { label: "Files: Delete", feature: "files", action: "delete" },
  { label: "Files: Embed", feature: "files", action: "execute" },

  // Prompt
  { label: "Prompt (RAG): Use", feature: "prompt", action: "execute" },

  // Mail
  { label: "Mail: View", feature: "mail", action: "view" },
  { label: "Mail: Send", feature: "mail", action: "execute" },

  // Calendar (backend-compatible: keep as execute unless you update backend choices)
  { label: "Calendar: Use (connect + prompt)", feature: "calendar", action: "execute" },
];

// Converts DRF error objects/arrays into a readable string (prevents rendering objects)
function errorToText(err) {
  if (!err) return "";
  if (typeof err === "string") return err;

  if (Array.isArray(err)) {
    return err.map(errorToText).filter(Boolean).join(", ");
  }

  if (typeof err === "object") {
    if (err.detail) return String(err.detail);
    return Object.entries(err)
      .map(([k, v]) => `${k}: ${errorToText(v)}`)
      .filter(Boolean)
      .join(" | ");
  }

  return String(err);
}

export default function CreateRolePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Optional: same pattern as your FileUpload page (load user from localStorage)
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const allKeys = useMemo(() => {
    return PERMISSIONS_UI.map((p) => `${p.feature}:${p.action}`);
  }, []);

  const allSelected = selected.size === allKeys.length && allKeys.length > 0;

  const handleBack = () => router.back();

  const toggle = (feature, action) => {
    const key = `${feature}:${action}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAll = () => setSelected(new Set(allKeys));
  const handleClearAll = () => setSelected(new Set());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const token = getAccessToken();
    if (!token) {
      setError("You are not logged in (missing accessToken).");
      return;
    }

    if (!name.trim()) {
      setError("Role name is required.");
      return;
    }

    const permissions = Array.from(selected).map((key) => {
      const [feature, action] = key.split(":");
      return { feature, action };
    });

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rbac/roles/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, permissions }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.non_field_errors?.[0] ||
          data?.name?.[0] ||
          errorToText(data?.permissions) ||
          data?.error ||
          errorToText(data) ||
          "Failed to create role";

        setError(msg);
        return;
      }

      router.back();
    } catch (err) {
      console.error("Network error:", err);
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SideBarLayout>
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="flex items-center justify-between mb-8 gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition px-4 py-2 hover:bg-gray-800 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="text-sm text-gray-400">
            {user ? `Logged in as: ${user.username}` : ""}
          </div>
        </div>

        <div className="max-w-2xl mx-auto bg-gray-800 border border-gray-700 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Role</h1>
          <p className="text-gray-400 mb-8">Create a role and assign feature permissions.</p>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Role Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-xl px-5 py-3 text-white focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition"
                placeholder="member"
                required
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="block text-sm font-medium text-gray-300">Permissions</div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={loading || allSelected}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm disabled:opacity-50"
                  >
                    Select all
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={loading || selected.size === 0}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm disabled:opacity-50"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {PERMISSIONS_UI.map((p) => {
                  const key = `${p.feature}:${p.action}`;
                  return (
                    <label key={key} className="flex items-center gap-3 text-gray-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selected.has(key)}
                        onChange={() => toggle(p.feature, p.action)}
                        disabled={loading}
                      />
                      <span>{p.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="text-xs text-gray-400 mt-3">
                Selected: {selected.size} / {allKeys.length}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Role"}
            </button>
          </form>
        </div>
      </div>
    </SideBarLayout>
  );
}
