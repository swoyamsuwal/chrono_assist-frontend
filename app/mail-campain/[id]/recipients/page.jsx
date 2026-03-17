"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SideBarLayout from "../../../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000/api/mail";

function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}
function authHeaders(isFormData = false) {
  const token = getAccessToken();
  const h = {};
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (!isFormData) h["Content-Type"] = "application/json";
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
    method: "POST", headers: authHeaders(), body: JSON.stringify(payload),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.detail || data?.error || "Request failed");
  return data;
}
async function apiPostForm(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST", headers: authHeaders(true), body: formData,
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.detail || data?.error || "Request failed");
  return data;
}
async function apiPatch(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH", headers: authHeaders(), body: JSON.stringify(payload),
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.detail || data?.error || "Request failed");
  return data;
}
async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE", headers: authHeaders(),
  });
  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch {}
    throw new Error(data?.detail || data?.error || "Delete failed");
  }
}

export default function RecipientsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [campaign, setCampaign]       = useState(null);
  const [recipients, setRecipients]   = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError]     = useState("");

  const [newEmail, setNewEmail]       = useState("");
  const [addLoading, setAddLoading]   = useState(false);
  const [addMsg, setAddMsg]           = useState({ type: "", text: "" });

  const [file, setFile]               = useState(null);
  const [fileLoading, setFileLoading] = useState(false);

  const [editingId, setEditingId]     = useState(null);
  const [editName, setEditName]       = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [search, setSearch]           = useState("");

  const load = async () => {
    if (!id) return;
    try {
      const [camp, recs] = await Promise.all([
        apiGet(`/campaigns/${id}/`),
        apiGet(`/campaigns/${id}/recipients/`),
      ]);
      setCampaign(camp);
      setRecipients(recs);
    } catch (e) {
      setPageError(e.message);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAddLoading(true);
    setAddMsg({ type: "", text: "" });
    try {
      const res = await apiPost(`/campaigns/${id}/recipients/`, {
        emails: [newEmail.trim()],
      });
      const a = res.added?.length || 0;
      const s = res.skipped_duplicates?.length || 0;
      setAddMsg({
        type: a > 0 ? "success" : "warn",
        text: a > 0
          ? `Added ${a} email${a !== 1 ? "s" : ""}`
          : `Already exists or invalid — skipped: ${s}`,
      });
      setNewEmail("");
      load();
    } catch (e) {
      setAddMsg({ type: "error", text: e.message });
    } finally {
      setAddLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setFileLoading(true);
    setAddMsg({ type: "", text: "" });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiPostForm(`/campaigns/${id}/recipients/`, form);
      const a = res.added?.length || 0;
      const s = res.skipped_duplicates?.length || 0;
      setAddMsg({
        type: a > 0 ? "success" : "warn",
        text: `Added: ${a}  |  Duplicate / skipped: ${s}`,
      });
      setFile(null);
      load();
    } catch (e) {
      setAddMsg({ type: "error", text: e.message });
    } finally {
      setFileLoading(false);
    }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditName(r.name);
  };

  const handleEditSave = async (rid) => {
    if (!editName.trim()) return;
    setEditLoading(true);
    try {
      await apiPatch(`/campaigns/${id}/recipients/${rid}/`, { name: editName.trim() });
      setEditingId(null);
      load();
    } catch (e) {
      setAddMsg({ type: "error", text: e.message });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (rid, email) => {
    if (!confirm(`Remove ${email} from this campaign?`)) return;
    try {
      await apiDelete(`/campaigns/${id}/recipients/${rid}/`);
      load();
    } catch (e) {
      setAddMsg({ type: "error", text: e.message });
    }
  };

  const filtered = recipients.filter(
    (r) =>
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (pageLoading) return (
    <SideBarLayout>
      <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </SideBarLayout>
  );

  if (pageError || !campaign) return (
    <SideBarLayout>
      <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600">{pageError || "Campaign not found."}</p>
        <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline">
          ← Go back
        </button>
      </div>
    </SideBarLayout>
  );

  return (
    <SideBarLayout>
      <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200">
          <div className="min-w-0">
            <button onClick={() => router.back()} className="text-xs text-indigo-600 hover:underline mb-1 block">
              ← Back to Campaigns
            </button>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
              People — <span className="text-indigo-600">{campaign.name}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Add panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
              <p className="text-sm font-semibold text-slate-900">Add Recipients</p>

              {/* Single */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">➕ Single Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="ram@gmail.com"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={addLoading || !newEmail.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
                  >
                    {addLoading ? "…" : "Add"}
                  </button>
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                   Upload File
                  <span className="ml-2 text-xs font-normal text-slate-400">CSV or TXT — one email per line</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => setFile(e.target.files[0] || null)}
                    className="flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <button
                    onClick={handleFileUpload}
                    disabled={fileLoading || !file}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-60"
                  >
                    {fileLoading ? "…" : "Upload"}
                  </button>
                </div>
              </div>

              {/* Feedback */}
              {addMsg.text && (
                <p className={[
                  "rounded-xl px-4 py-2.5 text-sm border",
                  addMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  addMsg.type === "warn"    ? "bg-amber-50 text-amber-700 border-amber-200" :
                                             "bg-red-50 text-red-700 border-red-200",
                ].join(" ")}>
                  {addMsg.text}
                </p>
              )}
            </div>

            {/* Recipients list */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-sm font-semibold text-slate-700">
                  Current Recipients
                  <span className="ml-2 text-xs font-normal text-slate-400">({filtered.length} shown)</span>
                </p>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {filtered.length === 0 ? (
                <div className="px-5 py-10 text-center text-slate-400">
                  <p className="text-sm">
                    {recipients.length === 0
                      ? "No recipients yet. Add some above."
                      : "No results match your search."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-5 py-3">

                      {/* Avatar */}
                      <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold uppercase">
                        {r.name?.[0] || "?"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate">{r.email}</p>

                        {editingId === r.id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleEditSave(r.id)}
                              className="rounded-lg border border-indigo-300 bg-indigo-50 px-2 py-1 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-300 w-32"
                            />
                            <button
                              onClick={() => handleEditSave(r.id)}
                              disabled={editLoading || !editName.trim()}
                              className="text-xs text-indigo-600 font-semibold hover:underline disabled:opacity-60"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs text-slate-400 hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Dear {r.name}
                            <button
                              onClick={() => startEdit(r)}
                              className="ml-2 text-indigo-500 hover:underline"
                            >
                              edit name
                            </button>
                          </p>
                        )}
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => handleDelete(r.id, r.email)}
                        className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-100 bg-white hover:bg-red-50 text-red-600 transition"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>
      </div>
    </SideBarLayout>
  );
}
