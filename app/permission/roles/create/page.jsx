"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SideBarLayout from "../../../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000";

function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

const PERMISSIONS_UI = [
  { label: "View",                       feature: "tasks",      action: "view" },
  { label: "Create",                     feature: "tasks",      action: "create" },
  { label: "Update",                     feature: "tasks",      action: "update" },
  { label: "Delete",                     feature: "tasks",      action: "delete" },
  { label: "View",                       feature: "permission", action: "view" },
  { label: "Create (roles/accounts)",    feature: "permission", action: "create" },
  { label: "Update (roles/accounts)",    feature: "permission", action: "update" },
  { label: "Delete (roles/accounts)",    feature: "permission", action: "delete" },
  { label: "View",                       feature: "files",      action: "view" },
  { label: "Upload",                     feature: "files",      action: "create" },
  { label: "Delete",                     feature: "files",      action: "delete" },
  { label: "Embed to AI",               feature: "files",      action: "execute" },
  { label: "Use RAG Chat",              feature: "prompt",     action: "execute" },
  // ── One-on-one Mail ──
  { label: "View",                    feature: "mail",       action: "view" },
  { label: "Send",                    feature: "mail",       action: "execute" },
  // ── Bulk Mail Campaign ──
  { label: "View Campaigns",          feature: "bulk_mail",  action: "view" },
  { label: "Create Campaign",         feature: "bulk_mail",  action: "create" },
  { label: "Edit Campaign",           feature: "bulk_mail",  action: "update" },
  { label: "Delete Campaign",         feature: "bulk_mail",  action: "delete" },
  { label: "Send Campaign",           feature: "bulk_mail",  action: "execute" },
  { label: "Use (connect + prompt)",    feature: "calendar",   action: "execute" },
];

const GROUPS = [
  { key: "tasks",      label: "Tasks",       color: "bg-indigo-50 text-indigo-700 ring-indigo-100",  dot: "bg-indigo-500" },
  { key: "permission", label: "Permissions", color: "bg-violet-50 text-violet-700 ring-violet-100",  dot: "bg-violet-500" },
  { key: "files",      label: "Files",       color: "bg-amber-50  text-amber-700  ring-amber-100",   dot: "bg-amber-500" },
  { key: "prompt",     label: "RAG Chat",    color: "bg-emerald-50 text-emerald-700 ring-emerald-100", dot: "bg-emerald-500" },
  { key: "mail",       label: "Mail",        color: "bg-blue-50   text-blue-700   ring-blue-100",    dot: "bg-blue-500" },
  { key: "bulk_mail",  label: "Bulk Mail",    color: "bg-cyan-50   text-cyan-700   ring-cyan-100",     dot: "bg-cyan-500" }, 
  { key: "calendar",   label: "Calendar",    color: "bg-rose-50   text-rose-700   ring-rose-100",    dot: "bg-rose-500" },
];

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

export default function CreateRolePage() {
  const router = useRouter();

  const [name, setName]       = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [user, setUser]       = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("user");
    if (stored) { try { setUser(JSON.parse(stored)); } catch { setUser(null); } }
  }, []);

  const allKeys    = useMemo(() => PERMISSIONS_UI.map((p) => `${p.feature}:${p.action}`), []);
  const allSelected = selected.size === allKeys.length && allKeys.length > 0;

  const toggle = (feature, action) => {
    const key = `${feature}:${action}`;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleGroup = (groupKey) => {
    const groupKeys = PERMISSIONS_UI.filter((p) => p.feature === groupKey).map((p) => `${p.feature}:${p.action}`);
    const allOn = groupKeys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      groupKeys.forEach((k) => (allOn ? next.delete(k) : next.add(k)));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const token = getAccessToken();
    if (!token) { setError("You are not logged in (missing accessToken)."); return; }
    if (!name.trim()) { setError("Role name is required."); return; }

    const permissions = Array.from(selected).map((key) => {
      const [feature, action] = key.split(":");
      return { feature, action };
    });

    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/rbac/roles/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, permissions }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.non_field_errors?.[0] || data?.name?.[0] ||
          errorToText(data?.permissions) || data?.error ||
          errorToText(data) || "Failed to create role"
        );
        return;
      }
      router.back();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SideBarLayout>
      <div className="w-full space-y-5">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Create Role</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Define a role name and assign feature permissions.
            </p>
          </div>
          <div className="flex items-center gap-3">
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

        {/* ── Error ── */}
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

          {/* ── TOP ROW — role name + summary side by side ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Role name — takes 2/3 */}
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

            {/* Summary card — takes 1/3 */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="text-sm font-medium text-slate-700 mb-3">
                  Selection summary
                </div>
                <div className="space-y-2">
                  {GROUPS.map((g) => {
                    const gKeys = PERMISSIONS_UI.filter((p) => p.feature === g.key).map((p) => `${p.feature}:${p.action}`);
                    const count = gKeys.filter((k) => selected.has(k)).length;
                    return (
                      <div key={g.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${g.dot}`}/>
                          <span className="text-xs text-slate-600">{g.label}</span>
                        </div>
                        <span className={`text-xs font-semibold ${count > 0 ? "text-slate-800" : "text-slate-300"}`}>
                          {count}/{gKeys.length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                {selected.size} of {allKeys.length} permissions selected
              </div>
            </div>

          </div>

          {/* ── Permissions card ── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">Permissions</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Toggle individual permissions or use group controls
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(allKeys))}
                  disabled={loading || allSelected}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
                >
                  Select all
                </button>
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

            {/* Progress bar */}
            <div className="h-1 bg-slate-100">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${allKeys.length ? (selected.size / allKeys.length) * 100 : 0}%` }}
              />
            </div>

            {/* Groups — 2 column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {GROUPS.map((group) => {
                const groupPerms  = PERMISSIONS_UI.filter((p) => p.feature === group.key);
                const groupKeys   = groupPerms.map((p) => `${p.feature}:${p.action}`);
                const groupSelected = groupKeys.filter((k) => selected.has(k)).length;
                const allGroupOn  = groupSelected === groupKeys.length;

                return (
                  <div key={group.key} className="p-5 border-b border-slate-100 last:border-b-0">

                    {/* Group header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-semibold ring-1 ${group.color}`}>
                          {group.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {groupSelected}/{groupKeys.length}
                        </span>
                      </div>
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

                    {/* Checkboxes — 2 or 3 cols depending on count */}
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
                            <div
                              className={[
                                "h-4 w-4 rounded shrink-0 border-2 grid place-items-center transition",
                                checked ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white",
                              ].join(" ")}
                            >
                              {checked && (
                                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 24 24" fill="none">
                                  <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
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

          {/* ── Submit row ── */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <p className="text-xs text-slate-400">
              {selected.size === 0
                ? "No permissions selected yet."
                : `${selected.size} permission${selected.size > 1 ? "s" : ""} will be assigned to this role.`}
            </p>
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
