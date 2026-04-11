"use client";

// ===============================================================
//  app/permission/roles/create/page.jsx  (Create Role page)
//  Form to define a new RBAC role with a name and a set of
//  feature-level permissions selected via checkboxes.
//
//  USER FLOW:
//    1. Enter a unique role name
//    2. Toggle individual permissions or use group/all shortcuts
//    3. Submit → POST /rbac/roles/  → redirect back on success
//
//  VALIDATION RULES (client-side, before the API call):
//    • Role name is required
//    • At least one "view" permission must be selected
//      (a role with zero visibility is functionally useless)
//
//  BACKEND ENDPOINT:
//    POST /rbac/roles/
//      body: { name: string, permissions: [{ feature, action }] }
//
//  PERMISSION STRUCTURE:
//    Each entry in PERMISSIONS_UI maps to one { feature, action } pair.
//    They are grouped by feature (GROUPS) for display purposes.
//    The internal key format is "feature:action" (e.g. "tasks:view").
// ===============================================================

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SideBarLayout from "../../../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000";

// Reads JWT from localStorage — safe to call on every request
function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

// ─── Permission definitions ───────────────────────────────────────────────────
// Master list of every permission the UI can toggle.
// Each entry maps to exactly one { feature, action } pair sent to the backend.
// The `label` is display-only — it never leaves the client.
//
// To add a new permission: append a new object here. The checkbox will appear
// automatically in its group section (matched by `feature`).
const PERMISSIONS_UI = [
  { label: "View",                    feature: "tasks",      action: "view" },
  { label: "Create",                  feature: "tasks",      action: "create" },
  { label: "Update",                  feature: "tasks",      action: "update" },
  { label: "Delete",                  feature: "tasks",      action: "delete" },
  { label: "View",                    feature: "permission", action: "view" },
  { label: "Create (roles/accounts)", feature: "permission", action: "create" },
  { label: "Update (roles/accounts)", feature: "permission", action: "update" },
  { label: "Delete (roles/accounts)", feature: "permission", action: "delete" },
  { label: "View",                    feature: "files",      action: "view" },
  { label: "Upload",                  feature: "files",      action: "create" },
  { label: "Delete",                  feature: "files",      action: "delete" },
  { label: "Embed to AI",             feature: "files",      action: "execute" },
  { label: "Use RAG Chat",            feature: "prompt",     action: "execute" },
  { label: "View",                    feature: "mail",       action: "view" },
  { label: "Send",                    feature: "mail",       action: "execute" },
  { label: "View Campaigns",          feature: "bulk_mail",  action: "view" },
  { label: "Create Campaign",         feature: "bulk_mail",  action: "create" },
  { label: "Edit Campaign",           feature: "bulk_mail",  action: "update" },
  { label: "Delete Campaign",         feature: "bulk_mail",  action: "delete" },
  { label: "Send Campaign",           feature: "bulk_mail",  action: "execute" },
  { label: "View",                    feature: "calendar",   action: "view" },
  { label: "Use (connect + prompt)",  feature: "calendar",   action: "execute" },
];

// ─── Feature groups ───────────────────────────────────────────────────────────
// Controls the section layout in the permissions grid.
// `key` must match the `feature` values in PERMISSIONS_UI.
// `color` / `dot` drive the badge and summary dot styling.
//
// This list also powers the Selection Summary card on the right —
// each group shows a "N/total" count of selected permissions.
const GROUPS = [
  { key: "tasks",      label: "Tasks",       color: "bg-indigo-50 text-indigo-700 ring-indigo-100",    dot: "bg-indigo-500" },
  { key: "permission", label: "Permissions", color: "bg-violet-50 text-violet-700 ring-violet-100",    dot: "bg-violet-500" },
  { key: "files",      label: "Files",       color: "bg-amber-50  text-amber-700  ring-amber-100",     dot: "bg-amber-500" },
  { key: "prompt",     label: "RAG Chat",    color: "bg-emerald-50 text-emerald-700 ring-emerald-100", dot: "bg-emerald-500" },
  { key: "mail",       label: "Mail",        color: "bg-blue-50   text-blue-700   ring-blue-100",      dot: "bg-blue-500" },
  { key: "bulk_mail",  label: "Bulk Mail",   color: "bg-cyan-50   text-cyan-700   ring-cyan-100",      dot: "bg-cyan-500" },
  { key: "calendar",   label: "Calendar",    color: "bg-rose-50   text-rose-700   ring-rose-100",      dot: "bg-rose-500" },
];

// ─── errorToText ──────────────────────────────────────────────────────────────
// Recursively flattens any shape of Django REST Framework error response
// into a single human-readable string.
//
// DRF can return errors as:
//   string         → "Role with this name already exists."
//   string[]       → ["This field is required."]
//   { detail: "" } → top-level non-field error
//   { field: [] }  → field-level errors dict
//   nested dicts   → e.g. permissions[0].action errors
//
// Returns "" when err is falsy so callers can safely do: setError(errorToText(data))
function errorToText(err) {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (Array.isArray(err)) return err.map(errorToText).filter(Boolean).join(", ");
  if (typeof err === "object") {
    if (err.detail) return String(err.detail);
    return Object.entries(err).map(([k, v]) => `${k}: ${errorToText(v)}`).filter(Boolean).join(" | ");
  }
  return String(err);
}

// ================================================================
//  Page component: CreateRolePage
//
//  State overview:
//    name        — controlled text input for the role name
//    selected    — Set<"feature:action"> of toggled permissions
//    loading     — true while POST /rbac/roles/ is in flight
//    error       — string shown in the red error banner
//    user        — { username } read from localStorage for the header pill
//
//  Derived values (useMemo / inline):
//    allKeys         — all possible "feature:action" key strings
//    allSelected     — true when every key is in `selected`
//    hasAtLeastOneView — true when any ":view" key is selected
//                       (used in submit validation + live warning hint)
// ================================================================
export default function CreateRolePage() {
  const router = useRouter();

  // ── Form state ────────────────────────────────────────────────────
  const [name,     setName]     = useState("");
  // Set<"feature:action"> — using a Set for O(1) has/add/delete operations
  const [selected, setSelected] = useState(() => new Set());
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // ── User pill ─────────────────────────────────────────────────────
  // Reads the cached user object from localStorage to display the
  // username badge in the page header. Runs once on mount.
  const [user, setUser] = useState(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("user");
    if (stored) { try { setUser(JSON.parse(stored)); } catch { setUser(null); } }
  }, []);

  // ── Derived: all possible keys + select-all state ─────────────────
  // allKeys is stable (PERMISSIONS_UI never changes) so this memo only
  // runs once, but useMemo documents intent and keeps the JSX readable.
  const allKeys     = useMemo(() => PERMISSIONS_UI.map((p) => `${p.feature}:${p.action}`), []);
  const allSelected = selected.size === allKeys.length && allKeys.length > 0;

  // ── Derived: view-permission guard ────────────────────────────────
  // True when at least one ":view" key is present in `selected`.
  // Used in two places:
  //   1. Live warning hint in the submit row (amber triangle)
  //   2. handleSubmit validation step (blocks the API call)
  const hasAtLeastOneView = Array.from(selected).some((k) => k.endsWith(":view"));

  // ── Toggle helpers ────────────────────────────────────────────────

  // Flips a single permission checkbox on or off.
  // Creates a new Set on every call so React detects the state change.
  const toggle = (feature, action) => {
    const key = `${feature}:${action}`;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Selects all permissions in a group when any are off,
  // or deselects all when every permission in the group is already on.
  // This is the "Select all / Deselect all" button inside each group header.
  const toggleGroup = (groupKey) => {
    const groupKeys = PERMISSIONS_UI
      .filter((p) => p.feature === groupKey)
      .map((p) => `${p.feature}:${p.action}`);
    const allOn = groupKeys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      groupKeys.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  // ================================================================
  //  Handler: handleSubmit
  //  Validation order (client-side, before the API call):
  //    1. Auth token present
  //    2. Role name is non-empty
  //    3. At least one ":view" permission is selected
  //  Then POSTs to /rbac/roles/ and navigates back on success.
  //
  //  Error mapping priority (API failure):
  //    non_field_errors[0] → name[0] → permissions errors →
  //    generic "error" key → full errorToText(data) fallback
  // ================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // ── 1. Auth token ────────────────────────────────────────────────
    const token = getAccessToken();
    if (!token) { setError("You are not logged in (missing accessToken)."); return; }

    // ── 2. Role name ─────────────────────────────────────────────────
    if (!name.trim()) { setError("Role name is required."); return; }

    // ── 3. At least one View permission ──────────────────────────────
    // A role with zero view permissions would be invisible in every
    // feature — the user would have access to nothing they can see.
    if (!hasAtLeastOneView) {
      setError("Select at least one View permission before creating this role.");
      return;
    }

    // ── 4. Build permissions payload ─────────────────────────────────
    // Convert "feature:action" keys back to { feature, action } objects
    const permissions = Array.from(selected).map((key) => {
      const [feature, action] = key.split(":");
      return { feature, action };
    });

    // ── 5. API call ───────────────────────────────────────────────────
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/rbac/roles/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, permissions }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Extract the most specific error message available from the DRF response
        setError(
          data?.non_field_errors?.[0] ||  // e.g. "Role with this name already exists."
          data?.name?.[0]             ||  // name field validation
          errorToText(data?.permissions) || // permissions array errors
          data?.error                 ||  // custom error key
          errorToText(data)           ||  // full fallback
          "Failed to create role"
        );
        return;
      }
      router.back(); // success → go back to the permissions list
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <SideBarLayout>
      <div className="w-full space-y-5">

        {/* ── Page header: title + username pill + Back button ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Create Role</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Define a role name and assign feature permissions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Username badge — read from localStorage on mount */}
            {user && (
              <span className="hidden sm:inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-slate-50 text-slate-700 ring-slate-200">
                {user.username}
              </span>
            )}
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          </div>
        </div>

        {/* Global error banner — shown for both client and server errors */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Top row: Role name (2/3) + Selection summary (1/3) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Role name input */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. member, manager, viewer"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition disabled:opacity-60"
              />
              <p className="mt-2 text-xs text-slate-400">
                Role names must be unique within your organisation.
              </p>
            </div>

            {/* Selection summary card — shows N/total per group + overall count */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700 mb-3">Selection summary</div>
                <div className="space-y-2">
                  {GROUPS.map((g) => {
                    const gKeys = PERMISSIONS_UI
                      .filter((p) => p.feature === g.key)
                      .map((p) => `${p.feature}:${p.action}`);
                    const count = gKeys.filter((k) => selected.has(k)).length;
                    return (
                      <div key={g.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${g.dot}`}/>
                          <span className="text-xs text-slate-600">{g.label}</span>
                        </div>
                        {/* Count turns bold black when at least one permission is selected */}
                        <span className={`text-xs font-semibold ${count > 0 ? "text-slate-800" : "text-slate-300"}`}>
                          {count}/{gKeys.length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Overall selected count at the bottom of the summary card */}
              <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                {selected.size} of {allKeys.length} permissions selected
              </div>
            </div>
          </div>

          {/* ── Permissions card ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

            {/* Card header: title + "Select all" / "Clear all" buttons */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">Permissions</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Toggle individual permissions or use group controls
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Select all — disabled when all keys are already selected */}
                <button
                  type="button"
                  onClick={() => setSelected(new Set(allKeys))}
                  disabled={loading || allSelected}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
                >
                  Select all
                </button>
                {/* Clear all — disabled when nothing is selected */}
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  disabled={loading || selected.size === 0}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Thin progress bar — fills proportionally as permissions are selected */}
            <div className="h-1 bg-slate-100">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${allKeys.length ? (selected.size / allKeys.length) * 100 : 0}%` }}
              />
            </div>

            {/* ── Feature groups grid: 1 col on mobile, 2 cols on large screens ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {GROUPS.map((group) => {
                const groupPerms    = PERMISSIONS_UI.filter((p) => p.feature === group.key);
                const groupKeys     = groupPerms.map((p) => `${p.feature}:${p.action}`);
                const groupSelected = groupKeys.filter((k) => selected.has(k)).length;
                const allGroupOn    = groupSelected === groupKeys.length;

                return (
                  <div key={group.key} className="p-5 border-b border-slate-100 last:border-b-0">

                    {/* Group header: feature badge + count + "Select/Deselect all" toggle */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-semibold ring-1 ${group.color}`}>
                          {group.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {groupSelected}/{groupKeys.length}
                        </span>
                      </div>
                      {/* Group-level toggle: selects all in group if any are off, deselects all if all are on */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        disabled={loading}
                        className={[
                          "text-xs font-semibold px-2.5 py-1 rounded-lg transition",
                          allGroupOn
                            ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                        ].join(" ")}
                      >
                        {allGroupOn ? "Deselect all" : "Select all"}
                      </button>
                    </div>

                    {/* ── Permission checkboxes ──
                        Rendered as styled <label> elements with a hidden native <input type="checkbox">
                        inside. The visible checkbox is a custom <div> that mirrors the checked state.
                        This gives us full control over the checked appearance while keeping
                        the native input for accessibility (keyboard + screen readers).           */}
                    <div className={`grid gap-2 ${groupPerms.length > 2 ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-2"}`}>
                      {groupPerms.map((p) => {
                        const key     = `${p.feature}:${p.action}`;
                        const checked = selected.has(key);
                        return (
                          <label
                            key={key}
                            className={[
                              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition",
                              checked ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50",
                              loading ? "opacity-60 cursor-not-allowed" : "",
                            ].join(" ")}
                          >
                            {/* Custom checkbox visual — mirrors the checked state */}
                            <div
                              className={[
                                "h-4 w-4 rounded shrink-0 border-2 grid place-items-center transition",
                                checked ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white",
                              ].join(" ")}
                            >
                              {/* Checkmark icon — only rendered when checked */}
                              {checked && (
                                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            {/* Hidden native checkbox — handles the actual toggle logic */}
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={checked}
                              onChange={() => toggle(p.feature, p.action)}
                              disabled={loading}
                            />
                            <span className={`text-xs font-medium leading-tight ${checked ? "text-indigo-700" : "text-slate-700"}`}>
                              {p.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Submit row: live hint (left) + Create Role button (right) ── */}
          <div className="flex items-center justify-between gap-4 pt-1">

            {/*
              Live hint — three states based on current selection:
                1. Nothing selected      → neutral grey "No permissions selected yet."
                2. Selected but no view  → amber warning triangle (early feedback before submit)
                3. At least one view     → neutral grey confirmation count
            */}
            {selected.size === 0 ? (
              <p className="text-xs text-slate-400">No permissions selected yet.</p>
            ) : !hasAtLeastOneView ? (
              // Early amber warning — shown before the user hits submit so they can
              // correct the selection without seeing a full red error banner.
              <p className="text-xs text-amber-600 flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                  <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                At least one <strong className="font-semibold mx-0.5">View</strong> permission is required.
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                {selected.size} permission{selected.size > 1 ? "s" : ""} will be assigned to this role.
              </p>
            )}

            {/* Create Role submit button — shows spinner while loading */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm shadow-indigo-200 shrink-0"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Creating role…
                </>
              ) : (
                <>
                  Create Role
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </SideBarLayout>
  );
}