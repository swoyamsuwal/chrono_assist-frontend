"use client";

import React, { useEffect, useMemo, useState } from "react";
import SideBarLayout from "../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000/api/mail";

function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

async function apiPost(path, payload) {
  const token = getAccessToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) throw new Error(data?.detail || "Request failed");
  return data;
}

const TONES = [
  { key: "angry_firm", label: "Angry / Firm Tone" },
  { key: "general_professional", label: "General / Professional Tone" },
  { key: "sweet_polite", label: "Sweet / Polite Tone" },
];

const WELCOME_MESSAGE = `Hello! I'm Chrono Assist AI. I can help you with:

• Writing an email from your instructions
• Choosing a tone / mood
• Confirming recipient email
• Generating subject + body
• Rewriting the draft
• Sending the email

What would you like to do today?

Start by describing the email
Example: “Write an email about my absence on 19 Dec 2025 due to headache.”`;

export default function EmailChatPage() {
  const [user, setUser] = useState(null);

  const [messages, setMessages] = useState([]); // {role, content}
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState("idle"); // idle | tone | recipient | draft
  const [tone, setTone] = useState(null);

  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [recipientInput, setRecipientInput] = useState("");

  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const lastUserName = useMemo(() => (user?.username ? user.username : "You"), [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
  }, []);

  // Welcome message once (only if chat is empty)
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [{ role: "assistant", content: WELCOME_MESSAGE }];
    });
  }, []);

  function resetFlow() {
    setStep("idle");
    setTone(null);
    setRecipient("");
    setRecipientInput("");
    setRecipientModalOpen(false);
    setSubject("");
    setBody("");
  }

  async function onSubmitPrompt(e) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setPrompt("");

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Choose the tone for this email:" },
    ]);
    setStep("tone");
  }

  function onTonePick(t) {
    setTone(t);
    const toneLabel = TONES.find((x) => x.key === t)?.label || t;

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `Tone selected: ${toneLabel}.` },
      { role: "assistant", content: "Enter the recipient email address." },
    ]);

    setStep("recipient");
    setRecipientModalOpen(true);
    setRecipientInput("");
  }

  async function onConfirmRecipient() {
    const email = recipientInput.trim();
    if (!email || !tone || loading) return;

    setRecipient(email);
    setRecipientModalOpen(false);

    const lastPrompt = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    setLoading(true);
    try {
      const data = await apiPost("/generate/", { prompt: lastPrompt, tone });
      const subj = String(data?.subject || "");
      const bod = String(data?.body || "");

      setSubject(subj);
      setBody(bod);
      setStep("draft");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Draft ready for ${email}:` },
        { role: "assistant", content: `Subject: ${subj}\n\n${bod}` },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Failed to generate email: ${err?.message || "Unknown error"}`,
        },
      ]);
      resetFlow();
    } finally {
      setLoading(false);
    }
  }

  async function onRewrite() {
    if (!tone || !recipient || loading) return;

    const lastPrompt = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    setLoading(true);
    try {
      const data = await apiPost("/generate/", { prompt: lastPrompt, tone });
      const subj = String(data?.subject || "");
      const bod = String(data?.body || "");

      setSubject(subj);
      setBody(bod);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Rewritten draft:" },
        { role: "assistant", content: `Subject: ${subj}\n\n${bod}` },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Failed to rewrite: ${err?.message || "Unknown error"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function onAcceptSend() {
    if (!recipient || !subject || !body || loading) return;

    setLoading(true);
    try {
      const data = await apiPost("/send/", { recipient, subject, body });

      if (data?.sent) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Sent to ${recipient}.` }]);
        resetFlow();
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Not sent (sent=false)." }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Send failed: ${err?.message || "Unknown error"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onCancel() {
    setMessages((prev) => [...prev, { role: "assistant", content: "Cancelled." }]);
    resetFlow();
  }

  return (
    <SideBarLayout>
      {/* IMPORTANT: fixed height + flex column so composer never gets pushed */}
      <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Email Assistant</h1>
            <p className="mt-1 text-sm text-slate-500">
              Describe the email → pick tone → confirm recipient → review draft.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {tone ? (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-indigo-50 text-indigo-700 ring-indigo-100">
                Tone: {TONES.find((x) => x.key === tone)?.label || tone}
              </span>
            ) : null}
            {recipient ? (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-slate-50 text-slate-700 ring-slate-200">
                To: {recipient}
              </span>
            ) : null}
          </div>
        </div>

        {/* Recipient modal */}
        {recipientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Send to</div>
                  <div className="mt-1 text-sm text-slate-500">Enter recipient email address.</div>
                </div>

                <button
                  onClick={() => {
                    setRecipientModalOpen(false);
                    onCancel();
                  }}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-2 text-sm font-semibold transition disabled:opacity-60"
                  disabled={loading}
                >
                  Close
                </button>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Recipient</label>
                <input
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                  placeholder="ram@gmail.com"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  onClick={() => {
                    setRecipientModalOpen(false);
                    onCancel();
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition disabled:opacity-60"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmRecipient}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60"
                  disabled={loading || !recipientInput.trim()}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat + Composer (scroll chat only) */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat scroll area */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-3">
                {messages.map((m, idx) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={idx}
                      className={[
                        "max-w-3xl rounded-2xl border px-4 py-3 shadow-sm",
                        isUser ? "ml-auto bg-white border-slate-200" : "mr-auto bg-white border-slate-200",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="text-xs font-semibold text-slate-700">
                          {isUser ? lastUserName : "Chrono Assist AI"}
                        </div>
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                            isUser
                              ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
                              : "bg-slate-50 text-slate-600 ring-slate-200",
                          ].join(" ")}
                        >
                          {isUser ? "You" : "Assistant"}
                        </span>
                      </div>

                      <div className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tone picker card */}
              {step === "tone" && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-w-3xl">
                  <div className="text-sm font-semibold text-slate-900">Select tone</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => onTonePick(t.key)}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 transition disabled:opacity-60"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Draft actions card */}
              {step === "draft" && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-w-3xl">
                  <div className="text-sm font-semibold text-slate-900">Draft actions</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={onCancel}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onRewrite}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-60"
                    >
                      Rewrite
                    </button>
                    <button
                      onClick={onAcceptSend}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-60"
                    >
                      Accept &amp; Send
                    </button>
                  </div>
                </div>
              )}

              {loading ? <div className="mt-4 text-sm text-slate-500">AI is thinking…</div> : null}
            </div>
          </div>

          {/* Composer fixed at bottom */}
          <form
            onSubmit={onSubmitPrompt}
            className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4"
          >
            <div className="max-w-4xl mx-auto flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading || step !== "idle"}
                  placeholder={step === "idle" ? "Describe the email you need..." : "Finish the current email flow first..."}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 disabled:opacity-60"
                />
                <div className="mt-2 text-xs text-slate-500">
                  Tip: Be specific (date, reason, person, and what you want them to do).
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || step !== "idle" || !prompt.trim()}
                className="shrink-0 h-[46px] px-5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {loading ? "Working..." : "Start"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SideBarLayout>
  );
}
