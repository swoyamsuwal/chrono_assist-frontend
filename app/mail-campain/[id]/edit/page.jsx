"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SideBarLayout from "../../../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000/api/mail";

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
    method: "POST", headers: authHeaders(), body: JSON.stringify(payload),
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

const TONES = [
  { key: "angry_firm",           label: "Angry / Firm" },
  { key: "general_professional", label: "General / Professional" },
  { key: "sweet_polite",         label: "Sweet / Polite" },
];

export default function EditDraftPage() {
  const { id } = useParams();
  const router = useRouter();

  const [campaign, setCampaign]       = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError]     = useState("");

  const [subject, setSubject]         = useState("");
  const [body, setBody]               = useState("");

  const [saving, setSaving]           = useState(false);
  const [savedMsg, setSavedMsg]       = useState("");
  const [saveError, setSaveError]     = useState("");

  const [showAi, setShowAi]           = useState(false);
  const [aiPrompt, setAiPrompt]       = useState("");
  const [aiTone, setAiTone]           = useState("general_professional");
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError, setAiError]         = useState("");

  useEffect(() => {
    if (!id) return;
    apiGet(`/campaigns/${id}/`)
      .then((data) => {
        setCampaign(data);
        setSubject(data.subject || "");
        setBody(data.body || "");
      })
      .catch((e) => setPageError(e.message))
      .finally(() => setPageLoading(false));
  }, [id]);

  const handleGenerate = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const data = await apiPost("/generate/", { prompt: aiPrompt, tone: aiTone });
      setSubject(String(data?.subject || ""));
      setBody(String(data?.body || ""));
      setSavedMsg("");
      setShowAi(false);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!subject.trim() || !body.trim()) {
      setSaveError("Both subject and body are required.");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSavedMsg("");
    try {
      await apiPatch(`/campaigns/${id}/`, {
        subject: subject.trim(),
        body: body.trim(),
      });
      setSavedMsg(" Draft saved! Go back and click Send when ready.");
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) return (
    <SideBarLayout>
      <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading campaign…</p>
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

  const previewRecipient = campaign.recipients?.[0];

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
              Edit Draft — <span className="text-indigo-600">{campaign.name}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Write your email. Save it, then go back and click Send.
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-violet-50 text-violet-700 ring-violet-100">
            👥 {campaign.recipient_count} recipient{campaign.recipient_count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50">
          <div className="max-w-3xl mx-auto space-y-5">

            {/* AI panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <button
                onClick={() => { setShowAi(!showAi); setAiError(""); }}
                className="flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 transition"
              >
                🤖 {showAi ? "Hide AI Generator" : "Generate with AI"}
                <span className="text-[11px] font-normal text-slate-400">(fills Subject & Body)</span>
              </button>

              {showAi && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      What do you want to say?
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder='e.g., "There will be no office tomorrow due to a public holiday."'
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tone</label>
                    <div className="flex flex-wrap gap-2">
                      {TONES.map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setAiTone(t.key)}
                          className={[
                            "px-4 py-2 rounded-xl text-sm font-semibold border transition",
                            aiTone === t.key
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {aiError && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-200">
                      {aiError}
                    </p>
                  )}
                  <button
                    onClick={handleGenerate}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
                  >
                    {aiLoading ? "AI is writing…" : "✨ Generate Draft"}
                  </button>
                </div>
              )}
            </div>

            {/* Compose */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <p className="text-sm font-semibold text-slate-900">Email Content</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => { setSubject(e.target.value); setSavedMsg(""); }}
                  placeholder="Email subject line"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Body
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    — "Dear [Name]," is added automatically per recipient
                  </span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => { setBody(e.target.value); setSavedMsg(""); }}
                  placeholder="There will be no office tomorrow due to a public holiday."
                  rows={10}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 font-mono"
                />
              </div>
            </div>

            {/* Live preview */}
            {body && previewRecipient && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-xs font-semibold text-amber-700 mb-3 uppercase tracking-wide">
                  📬 Preview — {previewRecipient.email}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {subject || "(no subject yet)"}
                </p>
                <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {`Dear ${previewRecipient.name},\n\n${body}`}
                </p>
              </div>
            )}

            {saveError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </p>
            )}
            {savedMsg && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {savedMsg}
              </p>
            )}
          </div>
        </div>

        {/* Sticky save bar */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-[46px] rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {saving ? "Saving…" : "💾 Save Draft"}
            </button>
            <button
              onClick={() => router.back()}
              className="h-[46px] px-5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </SideBarLayout>
  );
}
