// app/profile/page.jsx
"use client";

// ===============================================================
//  app/profile/page.jsx  (User Profile page)
//  Displays the logged-in user's profile and allows them to:
//    • Update their avatar via a hover-triggered file upload
//    • Edit their username, first name, and last name via a modal
//
//  BACKEND ENDPOINTS:
//    GET /authapp/profile/   → fetch the current user's profile data
//    PUT /authapp/profile/   → update profile (two call shapes):
//      a) multipart/form-data  { profile_picture: File }  → image upload
//      b) application/json    { username, first_name, last_name } → text update
//
//  STATE OVERVIEW:
//    profile        — the fetched profile object (null until loaded)
//    loading        — true during the initial GET /authapp/profile/ call
//    editOpen       — controls the Edit Profile modal visibility
//    form           — controlled inputs inside the modal
//    uploadingImage — true while the avatar PUT is in flight
//    saveLoading    — true while the text-field PUT is in flight
// ===============================================================

import { useEffect, useState } from "react";
import SideBarLayout from "../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000";

// Reads JWT from localStorage — returns null during SSR to avoid ReferenceError
function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

// ================================================================
//  Utility: initials
//  Generates a 1-2 character avatar initials string from the profile.
//
//  Priority:
//    1. First letter of first_name + first letter of last_name
//    2. First letter of username
//    3. Fallback "U"
//
//  e.g. { first_name: "John", last_name: "Doe" } → "JD"
//       { username: "alice" }                     → "A"
// ================================================================
function initials(profile) {
  const f = profile?.first_name?.[0] || "";
  const l = profile?.last_name?.[0]  || "";
  if (f || l) return `${f}${l}`.toUpperCase();
  return (profile?.username?.[0] || "U").toUpperCase();
}

// ================================================================
//  Page component: ProfilePage
//
//  Render branches:
//    loading=true      → full-page spinner
//    profile=null      → "No profile found" error state
//    profile loaded    → profile card + account info card + edit modal
// ================================================================
export default function ProfilePage() {
  // ── Data state ────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Edit modal state ──────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  // Mirrors the profile fields — pre-filled when the modal opens
  const [form, setForm] = useState({ username: "", first_name: "", last_name: "" });

  // ── Upload / save loading flags ───────────────────────────────────
  const [uploadingImage, setUploadingImage] = useState(false); // avatar PUT in flight
  const [saveLoading,    setSaveLoading]    = useState(false);  // text-field PUT in flight

  // ── Mount: fetch profile ──────────────────────────────────────────
  // Runs once on mount. Sets both `profile` (for display) and `form`
  // (pre-fills the edit modal) from the same API response.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }

    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/authapp/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { console.error("Failed to load profile", res.status); return; }
        const data = await res.json();
        setProfile(data);
        // Pre-fill the edit modal with current values so the user sees
        // their existing data when they open it — not an empty form.
        setForm({
          username:            data.username            || "",
          first_name:          data.first_name          || "",
          last_name:           data.last_name           || "",
          profile_picture_url: data.profile_picture_url || "",
        });
      } catch (e) {
        console.error("Profile error:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  // ================================================================
  //  Handler: handleImageChange
  //  Triggered by the hidden <input type="file"> inside the avatar
  //  hover overlay AND the "Change photo" button below the avatar.
  //
  //  Sends a multipart/form-data PUT (no Content-Type header — the
  //  browser sets the correct boundary automatically when using FormData).
  //  On success, updates the profile state so the new avatar renders
  //  without a full page refresh.
  // ================================================================
  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getAccessToken();
    if (!token) return;

    const formData = new FormData();
    formData.append("profile_picture", file);

    try {
      setUploadingImage(true);
      const res = await fetch(`${API_BASE}/authapp/profile/`, {
        method: "PUT",
        // Note: No "Content-Type" header — FormData sets it with the correct
        // multipart boundary. Adding it manually would break the upload.
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) { console.error("Image upload failed"); return; }
      const data = await res.json();
      setProfile(data); // replace profile so the new avatar URL renders immediately
    } catch (e) {
      console.error("Image upload error:", e);
    } finally {
      setUploadingImage(false);
    }
  }

  // ================================================================
  //  Handler: handleSaveProfile
  //  Submits the edit modal form as a JSON PUT.
  //  On success, updates both `profile` (reflected immediately in the
  //  info grid and name heading) and closes the modal.
  // ================================================================
  async function handleSaveProfile(e) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    try {
      setSaveLoading(true);
      const res = await fetch(`${API_BASE}/authapp/profile/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) { console.error("Profile update failed"); return; }
      const data = await res.json();
      setProfile(data);   // reflect the saved values in the profile card
      setEditOpen(false); // close the modal on success
    } catch (e) {
      console.error("Profile update error:", e);
    } finally {
      setSaveLoading(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <SideBarLayout>
        <div className="w-full h-full flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <svg className="h-8 w-8 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-slate-500">Loading profile…</p>
          </div>
        </div>
      </SideBarLayout>
    );
  }

  // ── No profile / unauthenticated state ────────────────────────────
  // Shown when the token was missing or the GET request failed.
  if (!profile) {
    return (
      <SideBarLayout>
        <div className="w-full flex items-center justify-center py-24">
          <div className="text-center">
            <div className="h-14 w-14 rounded-2xl bg-red-50 ring-1 ring-red-100 grid place-items-center mx-auto mb-4">
              <svg className="h-7 w-7 text-red-500" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-900">No profile found</p>
            <p className="mt-1 text-sm text-slate-500">Please log in again.</p>
          </div>
        </div>
      </SideBarLayout>
    );
  }

  // Display name: "First Last" → "First" → username → "—"
  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.username ||
    "—";

  // ── Main render ───────────────────────────────────────────────────
  return (
    <SideBarLayout>
      <div className="w-full max-w-3xl mx-auto space-y-5">

        {/* ── Page header: title + "Edit profile" button ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Profile</h1>
            <p className="mt-1 text-sm text-slate-500">Manage your personal information and photo.</p>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit profile
          </button>
        </div>

        {/* ── Profile card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Decorative top color band with a subtle dot pattern overlay */}
          <div className="h-24 bg-gradient-to-r from-indigo-600 to-violet-600 relative">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />
          </div>

          <div className="px-8 pb-8">

            {/* ── Avatar row: overlaps the color band via negative margin-top ── */}
            <div className="flex items-end justify-between -mt-12 mb-6">

              {/* Avatar + hover-to-upload overlay */}
              <div className="relative group">
                <div className="h-24 w-24 rounded-2xl border-4 border-white shadow-md bg-indigo-100 overflow-hidden grid place-items-center">
                  {profile.profile_picture_url ? (
                    // Show uploaded photo when available
                    <img
                      src={profile.profile_picture_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // Fall back to initials when no photo is set
                    <span className="text-3xl font-bold text-indigo-600">
                      {initials(profile)}
                    </span>
                  )}
                </div>

                {/* Upload overlay — revealed on hover via group-hover:opacity-100.
                    The hidden <input type="file"> triggers handleImageChange.     */}
                <label className="absolute inset-0 rounded-2xl bg-slate-900/50 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center">
                  {uploadingImage ? (
                    // Spinner replaces the upload icon while the PUT is in flight
                    <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    // Upload arrow icon shown while idle
                    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={uploadingImage}
                  />
                </label>
              </div>

              {/* "Change photo" text button — alternative upload trigger for
                  users who may not discover the hover overlay on touch devices */}
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-sm">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {uploadingImage ? "Uploading…" : "Change photo"}
                {/* Hidden file input — shares handleImageChange with the overlay above */}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={uploadingImage}
                />
              </label>
            </div>

            {/* Full name + @username subtitle */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">{fullName}</h2>
              <p className="mt-0.5 text-sm text-slate-500">@{profile.username || "—"}</p>
            </div>

            {/* Info grid: username + first name + last name as read-only tiles */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Username",   value: profile.username   || "—", icon: (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                )},
                { label: "First name", value: profile.first_name || "—", icon: (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )},
                { label: "Last name",  value: profile.last_name  || "—", icon: (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )},
              ].map((field) => (
                <div
                  key={field.label}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    {field.icon}
                    <span className="text-xs font-medium uppercase tracking-wider">{field.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Account security info card ── */}
        {/* Read-only — shows active security features and the user's role type.
            The role value comes from profile.user_type returned by the backend. */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center text-indigo-600">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 20 7v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">Account security</div>
              <div className="text-xs text-slate-500">Your account is protected with OTP 2FA.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-100">
              ✓ OTP 2FA Enabled
            </span>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-indigo-50 text-indigo-700 ring-indigo-100">
              ✓ JWT Authenticated
            </span>
            {/* user_type is returned by the backend — "main" for admin accounts,
                the assigned role name for sub-accounts created via sub-register   */}
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-slate-100 text-slate-600 ring-slate-200">
              Role: {profile.user_type || "main"}
            </span>
          </div>
        </div>

      </div>

      {/* ================================================================
           Edit Profile modal
           Rendered outside the scrollable content div so it overlays
           the entire viewport correctly (fixed positioning).

           Fields: username, first_name, last_name
           The profile_picture_url is NOT editable here — use the
           avatar hover overlay or "Change photo" button instead.
          ================================================================ */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-8">

            {/* Modal icon header */}
            <div className="flex justify-center mb-5">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center text-indigo-600">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900 text-center">Edit profile</h2>
            <p className="mt-1 text-sm text-slate-500 text-center">Update your name and username below.</p>

            <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                  placeholder="johndoe"
                />
              </div>

              {/* First name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">First name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                  placeholder="John"
                />
              </div>

              {/* Last name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Last name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                  placeholder="Doe"
                />
              </div>

              {/* ── Modal actions: Cancel + Save changes ── */}
              <div className="flex gap-3 pt-2">
                {/* Cancel — closes without saving; leaves profile state unchanged */}
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                {/* Save — triggers handleSaveProfile; shows spinner while in flight */}
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm shadow-indigo-200"
                >
                  {saveLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SideBarLayout>
  );
}