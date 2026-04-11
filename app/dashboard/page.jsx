"use client";

import React, { useEffect, useMemo, useState } from "react";
import SideBarLayout from "../components/Side_bar";
import { apiFetch } from "../lib/api";
import { usePermissions } from "../hooks/usePermissions";

const STATUS = {
  TASK: "TASK",
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED: "FINISHED",
};

function statusTitle(status) {
  if (status === STATUS.TASK) return "To do";
  if (status === STATUS.IN_PROGRESS) return "In progress";
  return "Done";
}

function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToISO(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function AssignedUserPill({ user }) {
  const name = user?.username ?? "Unassigned";
  return (
    <div className="flex items-center gap-2">
      <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 grid place-items-center text-[11px] font-semibold">
        {initials(name)}
      </div>
      <div className="text-xs text-slate-600">
        Assigned to <span className="font-medium text-slate-800">{name}</span>
      </div>
    </div>
  );
}

/* ──────────────── ICONS ──────────────── */

function IconPlus({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconDots({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h.01M12 12h.01M19 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IconTrash({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M10 11v7m4-7v7M9 7V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Clipboard with checklist lines — represents "To do" */
function IconTodo({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path
        d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Clock face — represents "In Progress" */
function IconInProgress({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Check-circle — represents "Done" */
function IconDone({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Map status → icon component */
function StatusIcon({ status, className = "" }) {
  if (status === STATUS.TASK)        return <IconTodo       className={className} />;
  if (status === STATUS.IN_PROGRESS) return <IconInProgress className={className} />;
  return                                    <IconDone       className={className} />;
}

/* Colour accent per column */
function columnAccent(col) {
  if (col === STATUS.TASK)        return "text-slate-500";
  if (col === STATUS.IN_PROGRESS) return "text-blue-500";
  return "text-emerald-500";
}

/* ──────────────── HELPERS ──────────────── */

function matchesQuery(task, q) {
  if (!q) return true;
  const hay = [task?.title, task?.short_description, task?.full_description, task?.assigned_to?.username]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

/* ──────────────── PAGE ──────────────── */

export default function TasksBoardPage() {
  const { hasPermission, loading: permLoading } = usePermissions();

  const canCreate = hasPermission("tasks", "create");
  const canUpdate = hasPermission("tasks", "update");
  const canDelete = hasPermission("tasks", "delete");

  const [board, setBoard]       = useState({ TASK: [], IN_PROGRESS: [], FINISHED: [] });
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");

  const [users, setUsers]               = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersErr, setUsersErr]         = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [createErr, setCreateErr]   = useState("");

  const [query, setQuery] = useState("");

  const [form, setForm] = useState({
    title: "",
    short_description: "",
    full_description: "",
    deadline: "",
    assigned_to: "",
  });

  const columns = useMemo(() => [STATUS.TASK, STATUS.IN_PROGRESS, STATUS.FINISHED], []);

  async function loadBoard() {
    setErr("");
    setLoading(true);
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

  async function loadUsers() {
    setUsersErr("");
    setUsersLoading(true);
    try {
      const data = await apiFetch("/authapp/list_users/");
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setUsers([]);
      setUsersErr(e.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
    loadUsers();
  }, []);

  async function moveTask(task, newStatus) {
    try {
      await apiFetch(`/api/tasks/tasks/${task.id}/update/`, {
        method: "PATCH",
        body: { status: newStatus },
      });
      await loadBoard();
    } catch (e) {
      alert(e.message || "Failed to update task");
    }
  }

  async function deleteTask(task) {
    try {
      await apiFetch(`/api/tasks/tasks/${task.id}/delete/`, { method: "DELETE" });
      await loadBoard();
    } catch (e) {
      alert(e.message || "Failed to delete task");
    }
  }

  function openCreateModal() {
    setCreateErr("");
    const d = new Date();
    d.setHours(d.getHours() + 1);
    setForm((p) => ({ ...p, deadline: p.deadline || toDatetimeLocalValue(d) }));
    setOpenCreate(true);
  }

  function closeCreateModal() {
    if (creating) return;
    setOpenCreate(false);
  }

  async function submitCreate(e) {
    e.preventDefault();
    setCreateErr("");
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
          assigned_to:       Number(form.assigned_to),
        },
      });
      setOpenCreate(false);
      setForm({ title: "", short_description: "", full_description: "", deadline: "", assigned_to: "" });
      await loadBoard();
    } catch (e2) {
      setCreateErr(e2.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  }

  const filteredBoard = useMemo(() => {
    const next = {};
    for (const col of columns) {
      next[col] = (board[col] || []).filter((t) => matchesQuery(t, query));
    }
    return next;
  }, [board, columns, query]);

  return (
    <SideBarLayout>
      <div className="min-h-[calc(100vh-40px)] w-full rounded-2xl border border-slate-200 bg-white">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Dashboard</h1>

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
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {err && (
          <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Board */}
        {loading || permLoading ? (
          <div className="px-6 py-14 text-center text-slate-500">Loading tasks...</div>
        ) : (
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {columns.map((col) => {
                const count = (filteredBoard[col] || []).length;

                return (
                  <div
                    key={col}
                    className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden"
                  >
                    {/* ── Column header ── */}
                    <div className="px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
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
                        {col === STATUS.TASK && canCreate && (
                          <button
                            onClick={openCreateModal}
                            className="h-9 w-9 grid place-items-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                            title="Add task"
                          >
                            <IconPlus className="h-5 w-5" />
                          </button>
                        )}

                        <button
                          className="h-9 w-9 grid place-items-center rounded-xl bg-transparent text-slate-500 hover:bg-white hover:border hover:border-slate-200 transition"
                          title="More"
                          type="button"
                        >
                          <IconDots className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* ── Cards ── */}
                    <div className="px-4 pb-4 space-y-4">
                      {(filteredBoard[col] || []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center text-sm text-slate-500">
                          No tasks
                        </div>
                      ) : (
                        filteredBoard[col].map((t) => (
                          <div
                            key={t.id}
                            className="rounded-2xl bg-white border border-slate-200 px-4 py-4 shadow-sm hover:shadow-md transition"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-slate-900 font-semibold leading-snug truncate">
                                  {t.title}
                                </div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                                  {t.short_description}
                                </div>
                              </div>

                              {/* DELETE: only visible in "To do" column */}
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

                            <div className="mt-4 flex flex-col gap-2">
                              <AssignedUserPill user={t.assigned_to} />
                              <div className="text-xs text-slate-500">
                                Deadline:{" "}
                                <span className="text-slate-800 font-medium">
                                  {t.deadline ? new Date(t.deadline).toLocaleString() : "—"}
                                </span>
                              </div>
                            </div>

                            {/* ── Move buttons with icons ── */}
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
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white transition"
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

      {/* ── Create Task Modal ── */}
      {openCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeCreateModal(); }}
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl p-6">
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

            {createErr && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
                {createErr}
              </div>
            )}

            {usersErr && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
                {usersErr}{" "}
                <button type="button" onClick={loadUsers} className="ml-2 underline" disabled={usersLoading}>
                  Retry
                </button>
              </div>
            )}

            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Short description</label>
                <input
                  value={form.short_description}
                  onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full description</label>
                <textarea
                  value={form.full_description}
                  onChange={(e) => setForm((p) => ({ ...p, full_description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 min-h-[120px] outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                  required
                  disabled={creating}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Deadline</label>
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    min={toDatetimeLocalValue(new Date())}
                    onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                    required
                    disabled={creating}
                    step="60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assign to</label>
                  <select
                    value={form.assigned_to}
                    onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                    required
                    disabled={creating || usersLoading}
                  >
                    <option value="">{usersLoading ? "Loading users..." : "Select a user"}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
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