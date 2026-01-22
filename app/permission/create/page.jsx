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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const API_BASE = "http://127.0.0.1:8000";

  function getAccessToken() {
    return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  }

  // Load roles for dropdown
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/rbac/roles/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;
        const data = await res.json();
        setRoles(data);
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      setLoading(false);
      return;
    }

    if (!roleId) {
      setError("Please select a role.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/authapp/sub-register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          ...formData,
          role_id: roleId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.email?.[0] || data.username?.[0] || data.error || "Failed to create account");
        return;
      }

      setSuccess(true);
      console.log("Sub-account created:", data.user);

      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (e) {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => router.back();

  if (success) {
    return (
      <SideBarLayout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-500/20 border-4 border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Account Created!</h2>
            <p className="text-gray-300 mb-8">Sub-account created successfully. Redirecting back...</p>
            <button
              onClick={handleBack}
              className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium"
            >
              Back to Roles
            </button>
          </div>
        </div>
      </SideBarLayout>
    );
  }

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
            Back to Roles
          </button>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Create Sub-Account</h1>
              <p className="text-gray-400">Create a new account under your main account</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-5 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  placeholder="Enter username"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-5 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  placeholder="user@example.com"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Role</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-5 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  required
                  disabled={loading}
                >
                  <option value="">Select a role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {roles.length === 0 && (
                  <div className="text-xs text-gray-400 mt-2">
                    No roles yet. Create a role first.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-5 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  placeholder="Enter strong password"
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-5 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                  placeholder="Re-enter password"
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {loading ? "Creating Account..." : "Create Sub-Account"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700 text-center">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition font-medium disabled:opacity-50"
              >
                Cancel & Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </SideBarLayout>
  );
}
