"use client";

import React, { useEffect, useMemo, useState } from "react";
import SideBarLayout from "../components/Side_bar";
import { apiFetch } from "../lib/api";

const STATUS = {
  TASK: "TASK",
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED: "FINISHED",
};

function statusTitle(status) {
  if (status === STATUS.TASK) return "TASK";
  if (status === STATUS.IN_PROGRESS) return "IN PROGRESS";
  return "FINISHED";
}

function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function datetimeLocalToISO(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function AssignedUserPill({ user }) {
  const name = user?.username ?? "—";
  const url = user?.profile_picture_url;

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400">Assigned:</span>

      {url ? (
        <img
          src={url}
          alt={name}
          className="w-6 h-6 rounded-full object-cover border border-gray-600"
          onError={(e) => {
            // fallback if MinIO URL blocked/403/etc.
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-700 border border-gray-600" />
      )}

      <span className="text-gray-200">{name}</span>
    </div>
  );
}

export default function TasksBoardPage() {
  const [board, setBoard] = useState({ TASK: [], IN_PROGRESS: [], FINISHED: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersErr, setUsersErr] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

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
        TASK: data.TASK || [],
        IN_PROGRESS: data.IN_PROGRESS || [],
        FINISHED: data.FINISHED || [],
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
    if (!deadlineISO) return setCreateErr("Invalid deadline date/time.");
    if (!form.assigned_to) return setCreateErr("Please select a user to assign.");

    setCreating(true);
    try {
      await apiFetch("/api/tasks/tasks/", {
        method: "POST",
        body: {
          title: form.title,
          short_description: form.short_description,
          full_description: form.full_description,
          deadline: deadlineISO,
          assigned_to: Number(form.assigned_to),
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

  return (
    <SideBarLayout>
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Tasks Board</h1>
          <button
            onClick={openCreateModal}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium"
          >
            Create Task
          </button>
        </div>

        {err ? (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">{err}</div>
        ) : null}

        {loading ? (
          <div className="py-10 text-center text-gray-400">Loading tasks...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columns.map((col) => (
              <div key={col} className="bg-gray-900/30 rounded-lg border border-gray-700">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-200">{statusTitle(col)}</div>
                  <div className="text-xs text-gray-400">{(board[col] || []).length}</div>
                </div>

                <div className="p-3 space-y-3">
                  {(board[col] || []).length === 0 ? (
                    <div className="text-sm text-gray-500 py-6 text-center">No tasks</div>
                  ) : (
                    board[col].map((t) => (
                      <div
                        key={t.id}
                        className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-white font-semibold">{t.title}</div>
                            <div className="text-xs text-gray-400 mt-1">{t.short_description}</div>
                          </div>

                          <button
                            onClick={() => deleteTask(t)}
                            title="Delete"
                            className="p-2 rounded-full bg-red-600 hover:bg-red-500 transition text-white"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7L5 7" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 11v6m4-6v6" />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M9 7V6a2 2 0 012-2h2a2 2 0 012 2v1"
                              />
                            </svg>
                          </button>
                        </div>

                        <div className="text-xs text-gray-400 mt-3 flex flex-col gap-2">
                          <AssignedUserPill user={t.assigned_to} />
                          <div>Deadline: {t.deadline ? new Date(t.deadline).toLocaleString() : "—"}</div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          {col !== STATUS.TASK && (
                            <button
                              onClick={() => moveTask(t, STATUS.TASK)}
                              className="px-3 py-2 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-100"
                            >
                              Move to TASK
                            </button>
                          )}
                          {col !== STATUS.IN_PROGRESS && (
                            <button
                              onClick={() => moveTask(t, STATUS.IN_PROGRESS)}
                              className="px-3 py-2 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white"
                            >
                              Move to IN_PROGRESS
                            </button>
                          )}
                          {col !== STATUS.FINISHED && (
                            <button
                              onClick={() => moveTask(t, STATUS.FINISHED)}
                              className="px-3 py-2 rounded text-xs bg-green-600 hover:bg-green-500 text-white"
                            >
                              Move to FINISHED
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal (unchanged except uses users list) */}
      {openCreate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div className="w-full max-w-2xl bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-white">Create Task</div>
              <button
                onClick={closeCreateModal}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition"
                disabled={creating}
              >
                Close
              </button>
            </div>

            {createErr ? (
              <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-4">{createErr}</div>
            ) : null}

            {usersErr ? (
              <div className="bg-yellow-500/15 border border-yellow-600 text-yellow-200 p-3 rounded-lg mb-4">
                {usersErr}{" "}
                <button type="button" onClick={loadUsers} className="ml-2 underline hover:text-white" disabled={usersLoading}>
                  Retry
                </button>
              </div>
            ) : null}

            <form onSubmit={submitCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white"
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Short description</label>
                <input
                  value={form.short_description}
                  onChange={(e) => setForm((p) => ({ ...p, short_description: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white"
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full description</label>
                <textarea
                  value={form.full_description}
                  onChange={(e) => setForm((p) => ({ ...p, full_description: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white min-h-[120px]"
                  required
                  disabled={creating}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Deadline</label>
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white"
                    required
                    disabled={creating}
                    step="60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Assign to</label>
                  <select
                    value={form.assigned_to}
                    onChange={(e) => setForm((p) => ({ ...p, assigned_to: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white"
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
                className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Task"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </SideBarLayout>
  );
}
