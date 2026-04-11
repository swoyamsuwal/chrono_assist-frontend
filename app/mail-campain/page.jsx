"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import SideBarLayout from "../components/Side_bar";
import { usePermissions } from "../hooks/usePermissions";

const API_BASE = "http://127.0.0.1:8000/api/mail";

const PAGE_SIZE = 8; // ← change to show more/fewer campaigns per page

function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

function authHeaders() {
  const token = getAccessToken();
  const h = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.detail || data?.error || "Request failed");
  return data;
}

async function apiPost(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.detail || data?.error || "Request failed");
  return data;
}

async function apiPatch(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.detail || data?.error || "Request failed");
  return data;
}

async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch {}
    throw new Error(data?.detail || data?.error || "Delete failed");
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onChange }) {
  if (totalPages <= 1) return null;

  function getPages() {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 4) pages.push("…");
    const start = Math.max(2, page - 1);
    const end   = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 3) pages.push("…");
    pages.push(totalPages);
    return pages;
  }

  const btnBase     = "h-9 min-w-[36px] px-2 rounded-xl text-sm font-medium transition flex items-center justify-center";
  const btnActive   = "bg-indigo-600 text-white shadow-sm";
  const btnInactive = "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50";
  const btnDisabled = "bg-white border border-slate-200 text-slate-300 cursor-not-allowed";

  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-slate-200 bg-white shrink-0">
      {/* Range label */}
      <span className="text-xs text-slate-500 tabular-nums">
        <span className="font-semibold text-slate-700">{rangeStart}–{rangeEnd}</span>
        {" "}of{" "}
        <span className="font-semibold text-slate-700">{total}</span> campaigns
      </span>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={`${btnBase} ${page === 1 ? btnDisabled : btnInactive}`}
          aria-label="Previous page"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Page numbers */}
        {getPages().map((p, idx) =>
          p === "…" ? (
            <span key={`ellipsis-${idx}`} className="h-9 w-9 flex items-center justify-center text-slate-400 text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`${btnBase} ${p === page ? btnActive : btnInactive}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className={`${btnBase} ${page === totalPages ? btnDisabled : btnInactive}`}
          aria-label="Next page"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ hasDraft, recipientCount }) {
  if (hasDraft && recipientCount > 0)
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
        Ready to send
      </span>
    );
  if (!hasDraft)
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200">
        No draft
      </span>
    );
  if (recipientCount === 0)
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-red-50 text-red-600 ring-1 ring-red-200">
        No recipients
      </span>
    );
  return null;
}

function Modal({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const router = useRouter();

  const { hasPermission, loading: permLoading } = usePermissions();

  const canCreate = hasPermission("bulk_mail", "create");
  const canUpdate = hasPermission("bulk_mail", "update");
  const canDelete = hasPermission("bulk_mail", "delete");
  const canSend   = hasPermission("bulk_mail", "execute");

  const [campaigns, setCampaigns]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [globalError, setGlobalError]     = useState("");

  const [showCreate, setShowCreate]       = useState(false);
  const [createName, setCreateName]       = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const [renaming, setRenaming]           = useState(null);
  const [renameName, setRenameName]       = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  const [sendState, setSendState]         = useState({});

  // ── pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(campaigns.length / PAGE_SIZE));

  const pagedCampaigns = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return campaigns.slice(start, start + PAGE_SIZE);
  }, [campaigns, page]);

  function handlePageChange(p) {
    setPage(Math.min(Math.max(1, p), totalPages));
  }

  const load = async () => {
    setLoading(true);
    setGlobalError("");
    try {
      setCampaigns(await apiGet("/campaigns/"));
      setPage(1); // reset to first page on reload
    } catch (e) {
      setGlobalError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    try {
      await apiPost("/campaigns/", { name: createName.trim() });
      setShowCreate(false);
      setCreateName("");
      await load(); // load() already resets to page 1
    } catch (e) {
      setGlobalError(e.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRename = async () => {
    if (!renameName.trim() || !renaming) return;
    setRenameLoading(true);
    try {
      await apiPatch(`/campaigns/${renaming.id}/`, { name: renameName.trim() });
      setRenaming(null);
      load();
    } catch (e) {
      setGlobalError(e.message);
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete "${c.name}" and all its recipients? This cannot be undone.`)) return;
    try {
      await apiDelete(`/campaigns/${c.id}/`);
      // shrink page if last item on current page was deleted
      setCampaigns((prev) => {
        const next = prev.filter((x) => x.id !== c.id);
        const newTotal = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
        setPage((p) => Math.min(p, newTotal));
        return next;
      });
    } catch (e) {
      setGlobalError(e.message);
    }
  };

  const handleSend = async (c) => {
    if (!c.has_draft) {
      setSendState((s) => ({
        ...s,
        [c.id]: { error: "No draft saved. Click 📝 Edit Draft to write the email first." },
      }));
      return;
    }
    if (c.recipient_count === 0) {
      setSendState((s) => ({
        ...s,
        [c.id]: { error: "No recipients. Click 👥 People to add emails first." },
      }));
      return;
    }
    setSendState((s) => ({ ...s, [c.id]: { loading: true, error: "", msg: "" } }));
    try {
      const res = await apiPost(`/campaigns/${c.id}/send/`, {});
      setSendState((s) => ({
        ...s,
        [c.id]: {
          msg: `Queued for ${res.total_recipients} recipient${res.total_recipients !== 1 ? "s" : ""}`,
        },
      }));
    } catch (e) {
      setSendState((s) => ({ ...s, [c.id]: { error: e.message } }));
    }
  };

  const anyRowAction = canUpdate || canDelete || canSend;

  return (
    <SideBarLayout>
      <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200 shrink-0">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Email Campaigns</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create group → add people → write draft → send.
            </p>
          </div>

          {canCreate && (
            <button
              onClick={() => { setCreateName(""); setShowCreate(true); }}
              className="shrink-0 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              + New Campaign
            </button>
          )}
        </div>

        {globalError && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shrink-0">
            {globalError}
          </div>
        )}

        {/* Scrollable campaign list */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50 min-h-0">
          <div className="max-w-4xl mx-auto space-y-4">

            {loading || permLoading ? (
              <p className="text-sm text-slate-500">Loading campaigns…</p>

            ) : campaigns.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-lg font-medium">No campaigns yet.</p>
                {canCreate && (
                  <p className="text-sm mt-1">
                    Click <strong className="text-slate-600">+ New Campaign</strong> to get started.
                  </p>
                )}
              </div>

            ) : (
              pagedCampaigns.map((c) => {
                const ss = sendState[c.id] || {};
                return (
                  <div key={c.id} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          <StatusBadge hasDraft={c.has_draft} recipientCount={c.recipient_count} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {c.recipient_count} recipient{c.recipient_count !== 1 ? "s" : ""}
                          {c.subject ? ` · "${c.subject}"` : " · no subject yet"}
                        </p>
                      </div>

                      {anyRowAction && (
                        <div className="shrink-0 flex flex-wrap gap-2">

                          {canUpdate && (
                            <>
                              <button
                                onClick={() => { setRenaming(c); setRenameName(c.name); }}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => router.push(`/mail-campain/${c.id}/edit`)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-indigo-100 bg-white hover:bg-indigo-50 text-indigo-700 transition"
                              >
                                Edit Draft
                              </button>
                              <button
                                onClick={() => router.push(`/mail-campain/${c.id}/recipients`)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-violet-100 bg-white hover:bg-violet-50 text-violet-700 transition"
                              >
                                People
                              </button>
                            </>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleDelete(c)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-100 bg-white hover:bg-red-50 text-red-600 transition"
                            >
                              Delete
                            </button>
                          )}

                          {canSend && (
                            <button
                              onClick={() => handleSend(c)}
                              disabled={ss.loading}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60"
                            >
                              {ss.loading ? "Sending…" : "Send"}
                            </button>
                          )}

                        </div>
                      )}
                    </div>

                    {ss.error && (
                      <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                        {ss.error}
                      </p>
                    )}
                    {ss.msg && (
                      <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                        {ss.msg}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination — pinned to the bottom of the card */}
        {!loading && !permLoading && campaigns.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={campaigns.length}
            onChange={handlePageChange}
          />
        )}

      </div>

      {/* Create modal */}
      {canCreate && showCreate && (
        <Modal>
          <p className="text-lg font-semibold text-slate-900 mb-1">New Campaign</p>
          <p className="text-sm text-slate-500 mb-4">
            Give it a name. Add people and the email draft separately after.
          </p>
          <input
            autoFocus
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g., Office Newsletter — March"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={createLoading || !createName.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {createLoading ? "Creating…" : "Create"}
            </button>
          </div>
        </Modal>
      )}

      {/* Rename modal */}
      {canUpdate && renaming && (
        <Modal>
          <p className="text-lg font-semibold text-slate-900 mb-1">Rename Campaign</p>
          <p className="text-sm text-slate-500 mb-4">
            Current: <strong>{renaming.name}</strong>
          </p>
          <input
            autoFocus
            type="text"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setRenaming(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRename}
              disabled={renameLoading || !renameName.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {renameLoading ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}
    </SideBarLayout>
  );
}