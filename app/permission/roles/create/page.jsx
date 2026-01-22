"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import SideBarLayout from "../../../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000";

function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

const PERMISSIONS_UI = [
  { label: "Files: View", feature: "files", action: "view" },
  { label: "Files: Upload", feature: "files", action: "create" },
  { label: "Files: Delete", feature: "files", action: "delete" },
  { label: "Files: Embed", feature: "files", action: "execute" },
  { label: "Prompt (RAG): Use", feature: "prompt", action: "execute" },
];

export default function CreateRolePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

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
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify({ name, permissions }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.log("Create role error:", data);

      setError(
        data?.non_field_errors?.[0] ||
        data?.name?.[0] ||
        data?.permissions?.[0] ||
        data?.error ||
        "Failed to create role"
      );
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
        <div className="flex items-center mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition px-4 py-2 hover:bg-gray-800 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
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
              <div className="block text-sm font-medium text-gray-300 mb-3">Permissions</div>
              <div className="space-y-3">
                {PERMISSIONS_UI.map((p) => (
                  <label key={`${p.feature}:${p.action}`} className="flex items-center gap-3 text-gray-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selected.has(`${p.feature}:${p.action}`)}
                      onChange={() => toggle(p.feature, p.action)}
                      disabled={loading}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
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
