"use client";

// ===============================================================
//  app/tasks/page.jsx  (or wherever this lives)
//  Kanban-style task board with three columns:
//    To do → In Progress → Done
//
//  DEPENDS ON:
//    - apiFetch()        → lib/api.js       (handles auth headers + JSON)
//    - usePermissions()  → hooks/usePermissions.js (RBAC gate)
//    - SideBarLayout     → components/Side_bar.jsx
//
//  PERMISSION KEYS USED:
//    tasks.create  → show "Add task" button + create modal
//    tasks.update  → show move-status buttons on each card
//    tasks.delete  → show delete button (To do column only)
// ===============================================================

import React, { useEffect, useMemo, useState } from "react";
import SideBarLayout from "../components/Side_bar";
import { apiFetch } from "../lib/api";
import { usePermissions } from "../hooks/usePermissions";

// ─── Status constants ────────────────────────────────────────────────────────
// These match the exact string values the Django API stores in task.status.
// Using a frozen object avoids typo bugs (e.g. "IN_PROGRES" vs "IN_PROGRESS").
const STATUS = {
  TASK:        "TASK",
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED:    "FINISHED",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Maps a STATUS key → human-readable column title shown in the board header
function statusTitle(status) {
  if (status === STATUS.TASK)        return "To do";
  if (status === STATUS.IN_PROGRESS) return "In progress";
  return "Done";
}

// Converts a JS Date → "YYYY-MM-DDTHH:MM" string (required by <input type="datetime-local">)
function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Converts the datetime-local string back to a full ISO-8601 string for the API.
// Returns null if the value is invalid so the caller can show a validation error.
function datetimeLocalToISO(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// Generates up-to-two-letter initials from a display name (e.g. "John Doe" → "JD")
function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ─── AssignedUserPill ─────────────────────────────────────────────────────────
// Small inline component shown on each task card.
// Receives the full assigned_to user object from the API (or null/undefined).
function AssignedUserPill({ user }) {
  const name = user?.username ?? "Unassigned";
  return (
    <div className="flex items-center gap-2">
      {/* Avatar circle — initials only, no profile picture needed here */}
      <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 grid place-items-center text-[11px] font-semibold">
        {initials(name)}
      </div>
      <div className="text-xs text-slate-600">
        Assigned to <span className="font-medium text-slate-800">{name}</span>
      </div>
    </div>
  );
}

// ─── Icon components ──────────────────────────────────────────────────────────
// Thin SVG wrappers so JSX stays readable. Each accepts an optional className
// for sizing/coloring via Tailwind (e.g. className="h-5 w-5 text-slate-500").

// "+" icon used on the Add Task button
function IconPlus({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Trash/bin icon used on the Delete button
function IconTrash({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M10 11v7m4-7v7M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// Clipboard icon — represents the "To do" column
function IconTodo({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path
        d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
      />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// Clock-face icon — represents the "In Progress" column
function IconInProgress({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Circle-checkmark icon — represents the "Done" column
function IconDone({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Renders the correct icon for a given STATUS value — used in column headers
function StatusIcon({ status, className = "" }) {
  if (status === STATUS.TASK)        return <IconTodo       className={className} />;
  if (status === STATUS.IN_PROGRESS) return <IconInProgress className={className} />;
  return                                    <IconDone       className={className} />;
}

// Returns a Tailwind text-color class for the status icon in each column header
function columnAccent(col) {
  if (col === STATUS.TASK)        return "text-slate-500";
  if (col === STATUS.IN_PROGRESS) return "text-blue-500";
  return "text-emerald-500";
}

// Returns true if a task matches the user's search query.
// Searches title, short_description, full_description, and assigned username.
function matchesQuery(task, q) {
  if (!q) return true;
  const hay = [task?.title, task?.short_description, task?.full_description, task?.assigned_to?.username]
    .filter(Boolean).join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

// ================================================================
//  Page component: TasksBoardPage
//
//  Layout structure:
//    <SideBarLayout>
//      <outer card>          ← fixed viewport height, flex-col
//        <top bar>           ← title + search, never scrolls
//        <board area>        ← flex-1, fills remaining height
//          <3-column grid>   ← each column is flex-col
//            <column header> ← pinned, never scrolls
//            <cards scroll>  ← flex-1 overflow-y-auto per column
//      <create modal>        ← portal-like fixed overlay
// ================================================================
export default function TasksBoardPage() {

  // ── Permission gates ──────────────────────────────────────────
  // Reads the current user's RBAC permissions from context.
  // UI elements that require a permission are conditionally rendered.
  const { hasPermission, loading: permLoading } = usePermissions();

  const canCreate = hasPermission("tasks", "create"); // show Add Task button + modal
  const canUpdate = hasPermission("tasks", "update"); // show move-status buttons
  const canDelete = hasPermission("tasks", "delete"); // show delete button (To do only)

  // ── Board state ───────────────────────────────────────────────
  // board holds the three column arrays returned by the API's board endpoint.
  // Shape: { TASK: Task[], IN_PROGRESS: Task[], FINISHED: Task[] }
  const [board, setBoard]     = useState({ TASK: [], IN_PROGRESS: [], FINISHED: [] });
  const [loading, setLoading] = useState(true);  // true while initial board fetch is in flight
  const [err, setErr]         = useState("");     // board-level error message

  // ── Users state (for the "Assign to" dropdown in the create modal) ──
  const [users, setUsers]               = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersErr, setUsersErr]         = useState("");

  // ── Create modal state ────────────────────────────────────────
  const [openCreate, setOpenCreate] = useState(false); // controls modal visibility
  const [creating, setCreating]     = useState(false); // true while POST is in flight
  const [createErr, setCreateErr]   = useState("");    // inline error inside the modal

  // ── Search query ──────────────────────────────────────────────
  // Filtered client-side — no extra API call on each keystroke
  const [query, setQuery] = useState("");

  // ── Create form fields ────────────────────────────────────────
  const [form, setForm] = useState({
    title: "",
    short_description: "",
    full_description: "",
    deadline: "",
    assigned_to: "",  // user id (number) stored as string until submit
  });

  // Stable column order — memoised so it never changes reference between renders
  const columns = useMemo(() => [STATUS.TASK, STATUS.IN_PROGRESS, STATUS.FINISHED], []);

  // ── Data fetchers ─────────────────────────────────────────────

  // Fetches the board from GET /api/tasks/tasks/board/
  // The API returns { TASK: [...], IN_PROGRESS: [...], FINISHED: [...] }
  async function loadBoard() {
    setErr(""); setLoading(true);
    try {
      const data = await apiFetch("/api/tasks/tasks/board/");
      setBoard({
        TASK:        data.TASK        || [],
        IN_PROGRESS: data.IN_PROGRESS || [],
        FINISHED:    data.FINISHED    || [],
      });
    } catch (e) {
      setErr(e.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  // Fetches the full user list from GET /authapp/list_users/
  // Used to populate the "Assign to" <select> in the create modal
  async function loadUsers() {
    setUsersErr(""); setUsersLoading(true);
    try {
      const data = await apiFetch("/authapp/list_users/");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setUsers([]); setUsersErr(e.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }

  // Load board + users in parallel on first mount
  useEffect(() => { loadBoard(); loadUsers(); }, []);

  // ── Task actions ──────────────────────────────────────────────

  // Moves a task to a new status column via PATCH /api/tasks/tasks/:id/update/
  // Re-fetches the board after success so counts + order stay in sync with the server
  async function moveTask(task, newStatus) {
    try {
      await apiFetch(`/api/tasks/tasks/${task.id}/update/`, { method: "PATCH", body: { status: newStatus } });
      await loadBoard();
    } catch (e) { alert(e.message || "Failed to update task"); }
  }

  // Permanently deletes a task via DELETE /api/tasks/tasks/:id/delete/
  // Only rendered for tasks in the TASK (To do) column
  async function deleteTask(task) {
    try {
      await apiFetch(`/api/tasks/tasks/${task.id}/delete/`, { method: "DELETE" });
      await loadBoard();
    } catch (e) { alert(e.message || "Failed to delete task"); }
  }

  // ── Modal helpers ─────────────────────────────────────────────

  // Opens the create modal and pre-fills the deadline to "1 hour from now"
  // so the user always has a sensible default without having to type one
  function openCreateModal() {
    setCreateErr("");
    const d = new Date(); d.setHours(d.getHours() + 1);
    setForm((p) => ({ ...p, deadline: p.deadline || toDatetimeLocalValue(d) }));
    setOpenCreate(true);
  }

  // Dismisses the modal; blocked while a POST is in flight to avoid orphaned requests
  function closeCreateModal() { if (creating) return; setOpenCreate(false); }

  // Handles the create form submission
  // Validates deadline and assigned_to before hitting the API
  async function submitCreate(e) {
    e.preventDefault(); setCreateErr("");

    const deadlineISO = datetimeLocalToISO(form.deadline);
    if (!deadlineISO)      return setCreateErr("Invalid deadline date/time.");
    if (!form.assigned_to) return setCreateErr("Please select a user to assign.");

    setCreating(true);
    try {
      await apiFetch("/api/tasks/tasks/", {
        method: "POST",
        body: {
          title:             form.title,
          short_description: form.short_description,
          full_description:  form.full_description,
          deadline:          deadlineISO,
          assigned_to:       Number(form.assigned_to), // API expects an integer id
        },
      });
      setOpenCreate(false);
      // Reset form fields so the modal is clean on next open
      setForm({ title: "", short_description: "", full_description: "", deadline: "", assigned_to: "" });
      await loadBoard(); // refresh board so the new card appears immediately
    } catch (e2) {
      setCreateErr(e2.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  // ── Filtered board (client-side search) ──────────────────────
  // Re-computed only when board data or query changes — not on every render.
  // filteredBoard has the same shape as board: { TASK, IN_PROGRESS, FINISHED }
  const filteredBoard = useMemo(() => {
    const next = {};
    for (const col of columns) {
      next[col] = (board[col] || []).filter((t) => matchesQuery(t, query));
    }
    return next;
  }, [board, columns, query]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <SideBarLayout>
      {/*
        ┌─────────────────────────────────────────────────────────┐
        │ Outer card — fixed viewport height, flex column         │
        │ so the board area fills all remaining space             │
        └─────────────────────────────────────────────────────────┘
      */}
      <div className="h-[calc(100vh-40px)] w-full rounded-2xl border border-slate-200 bg-white flex flex-col overflow-hidden">

        {/* ── Top bar — title + search, pinned, never scrolls ── */}
        <div className="shrink-0 flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Dashboard</h1>

          {/* Search input — clears with ✕ button when query is non-empty */}
          <div className="w-full max-w-md">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 text-sm"
                >✕</button>
              )}
            </div>
          </div>
        </div>

        {/* Board-level error banner (e.g. network failure on loadBoard) */}
        {err && (
          <div className="shrink-0 mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* ── Board area — fills remaining card height ── */}
        {loading || permLoading ? (
          // Full-area spinner shown while the initial data fetch completes
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Loading tasks...
          </div>
        ) : (
          /*
            flex-1 + overflow-hidden lets the grid fill remaining card height.
            Each column is flex-col with its own independent overflow-y-auto cards area.
          */
          <div className="flex-1 overflow-hidden px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full">

              {columns.map((col) => {
                const count = (filteredBoard[col] || []).length;

                return (
                  <div
                    key={col}
                    /*
                      flex flex-col + overflow-hidden on the column wrapper.
                      Header → shrink-0 (always visible).
                      Cards  → flex-1 overflow-y-auto (scrolls independently).
                    */
                    className="rounded-2xl bg-slate-50 border border-slate-200 flex flex-col overflow-hidden"
                  >
                    {/* ── Column header — pinned, never scrolls ── */}
                    <div className="shrink-0 px-4 py-4 flex items-center justify-between border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        {/* Colored status icon + column title + task count badge */}
                        <StatusIcon
                          status={col}
                          className={`h-5 w-5 flex-shrink-0 ${columnAccent(col)}`}
                        />
                        <div className="text-sm font-semibold text-slate-900">{statusTitle(col)}</div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                          {count}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* "Add task" button — only in the To do column, only for canCreate users */}
                        {col === STATUS.TASK && canCreate && (
                          <button
                            onClick={openCreateModal}
                            className="h-9 w-9 grid place-items-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                            title="Add task"
                          >
                            <IconPlus className="h-5 w-5" />
                          </button>
                        )}
                        {/* Placeholder "more options" button — no action yet */}
                        <button
                          className="h-9 w-9 grid place-items-center rounded-xl bg-transparent text-slate-500 hover:bg-white hover:border hover:border-slate-200 transition"
                          title="More" type="button"
                        />
                      </div>
                    </div>

                    {/* ── Cards — independent scroll area per column ── */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">

                      {(filteredBoard[col] || []).length === 0 ? (
                        // Empty state shown when the column has no tasks (or none match the search)
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center text-sm text-slate-500">
                          No tasks
                        </div>
                      ) : (
                        filteredBoard[col].map((t) => (
                          <div
                            key={t.id}
                            className="rounded-2xl bg-white border border-slate-200 px-4 py-4 shadow-sm hover:shadow-md transition"
                          >
                            {/* ── Card top row: title + optional delete button ── */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-slate-900 font-semibold leading-snug truncate">{t.title}</div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{t.short_description}</div>
                              </div>

                              {/* Delete button — shown only in To do + only for canDelete users */}
                              {canDelete && col === STATUS.TASK && (
                                <button
                                  onClick={() => deleteTask(t)}
                                  title="Delete"
                                  className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition"
                                >
                                  <IconTrash className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            {/* ── Card meta: assigned user + deadline ── */}
                            <div className="mt-4 flex flex-col gap-2">
                              <AssignedUserPill user={t.assigned_to} />
                              <div className="text-xs text-slate-500">
                                Deadline:{" "}
                                <span className="text-slate-800 font-medium">
                                  {t.deadline ? new Date(t.deadline).toLocaleString() : "—"}
                                </span>
                              </div>
                            </div>

                            {/* ── Move-status buttons — canUpdate only ──
                                Only the buttons for OTHER columns are shown
                                (a task already in "In Progress" won't show "In Progress") */}
                            {canUpdate && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {col !== STATUS.TASK && (
                                  <button
                                    onClick={() => moveTask(t, STATUS.TASK)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                                  >
                                    <IconTodo className="h-3.5 w-3.5 text-slate-500" />
                                    To do
                                  </button>
                                )}
                                {col !== STATUS.IN_PROGRESS && (
                                  <button
                                    onClick={() => moveTask(t, STATUS.IN_PROGRESS)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-[#4F39F6] hover:bg-blue-700 text-white transition"
                                  >
                                    <IconInProgress className="h-3.5 w-3.5" />
                                    In Progress
                                  </button>
                                )}
                                {col !== STATUS.FINISHED && (
                                  <button
                                    onClick={() => moveTask(t, STATUS.FINISHED)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition"
                                  >
                                    <IconDone className="h-3.5 w-3.5" />
                                    Done
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          Create Task Modal
          - Rendered via a fixed overlay (not a portal) — z-50 keeps it above the sidebar
          - Clicking the backdrop (not the card) dismisses the modal
          - Disabled while POST is in flight (creating === true)
          ================================================================ */}
      {openCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeCreateModal(); }}
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl p-6">

            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-slate-900">Create Task</div>
              <button
                onClick={closeCreateModal}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl transition"
                disabled={creating}
              >
                Close
              </button>
            </div>

            {/* API error from the create POST (e.g. validation from Django) */}
            {createErr && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
                {createErr}
              </div>
            )}

            {/* Warning if the users list failed to load — with a retry link */}
            {usersErr && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
                {usersErr}{" "}
                <button type="button" onClick={loadUsers} className="ml-2 underline" disabled={usersLoading}>
                  Retry
                </button>
              </div>
            )}

            <form onSubmit={submitCreate} className="space-y-4">

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                  required disabled={creating}
                />
              </div>

              {/* Short description — shown on the card preview */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Short description</label>
                <input
                  value={form.short_description}
                  onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                  required disabled={creating}
                />
              </div>

              {/* Full description — detail view / expanded modal later */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full description</label>
                <textarea
                  value={form.full_description}
                  onChange={(e) => setForm((p) => ({ ...p, full_description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 min-h-[120px] outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                  required disabled={creating}
                />
              </div>

              {/* Deadline + Assign to — side by side on md+ screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                {/* Deadline — datetime-local input, min capped to now */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Deadline</label>
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    min={toDatetimeLocalValue(new Date())}
                    onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                    required disabled={creating} step="60"
                  />
                </div>

                {/* Assign to — populated from /authapp/list_users/ */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assign to</label>
                  <select
                    value={form.assigned_to}
                    onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                    required disabled={creating || usersLoading}
                  >
                    <option value="">{usersLoading ? "Loading users..." : "Select a user"}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit — disabled + label change while POST is in flight */}
              <button
                type="submit" disabled={creating}
                className="w-full px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Task"}
              </button>
            </form>
          </div>
        </div>
      )}
    </SideBarLayout>
  );
}