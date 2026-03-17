"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SideBarLayout from "../../components/Side_bar";

export default function CreateAccountPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [confirmPassword, setConfirmPassword] = useState("");
  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState("");

  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const API_BASE = "http://127.0.0.1:8000";

  function getAccessToken() {
    return typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    (async () => {
      try {
        setRolesLoading(true);
        const res = await fetch(`${API_BASE}/rbac/roles/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : data?.results || [];
        setRoles(list);
      } catch {
        // ignore
      } finally {
        setRolesLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    if (!roleId) {
      setError("Please select a role.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/authapp/sub-register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ ...formData, role_id: roleId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.email?.[0] ||
            data.username?.[0] ||
            data.error ||
            "Failed to create account."
        );
        return;
      }

      setSuccess(true);
      setTimeout(() => router.back(), 2000);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => router.back();

  // ── Success State ──────────────────────────────────────────────
  if (success) {
    return (
      <SideBarLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-10 max-w-md w-full text-center">
            {/* Green check circle */}
            <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-emerald-50 ring-4 ring-emerald-100 grid place-items-center">
              <svg
                className="h-8 w-8 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Account Created!
            </h2>
            <p className="text-sm text-slate-500 mb-8">
              Sub-account created successfully. Redirecting back…
            </p>

            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Back to Permissions
            </button>
          </div>
        </div>
      </SideBarLayout>
    );
  }

  // ── Main Form ──────────────────────────────────────────────────
  return (
    <SideBarLayout>
      <div className="w-full">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition grid place-items-center"
            title="Go back"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              Create Sub-Account
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Add a new user account under your organization
            </p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form card */}
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-sm p-8">

          {/* Card heading */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center text-indigo-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path
                  d="M15 19c0-1.657-2.239-3-5-3s-5 1.343-5 3v1h10v-1Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 8v6M16 11h6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                Account Details
              </div>
              <div className="text-sm text-slate-500">
                Fill in the information below to create a new user
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="Enter username"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 disabled:opacity-50 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="user@example.com"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 disabled:opacity-50 transition"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Role
              </label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
                disabled={loading || rolesLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 disabled:opacity-50 transition"
              >
                <option value="" disabled>
                  {rolesLoading ? "Loading roles…" : "Select a role"}
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              {!rolesLoading && roles.length === 0 && (
                <p className="mt-1.5 text-xs text-slate-500">
                  No roles found.{" "}
                  <a
                    href="/permission/roles/create"
                    className="text-indigo-600 hover:underline"
                  >
                    Create a role first.
                  </a>
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 pt-1" />

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Enter strong password"
                required
                minLength={8}
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 disabled:opacity-50 transition"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                minLength={8}
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 disabled:opacity-50 transition"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                      />
                    </svg>
                    Creating…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                      <path
                        d="M15 19c0-1.657-2.239-3-5-3s-5 1.343-5 3v1h10v-1Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M19 8v6M16 11h6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Create Sub-Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SideBarLayout>
  );
}
