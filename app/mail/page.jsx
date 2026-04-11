"use client";

// ===============================================================
//  app/email/page.jsx  (or wherever this route lives)
//  AI-guided email composition chat page.
//
//  USER FLOW (step machine):
//    idle      → user types a prompt describing the email
//    tone      → AI presents tone picker buttons (Angry / Professional / Polite)
//    recipient → modal opens for the user to enter a recipient email address
//    draft     → AI generates subject + body; user can Rewrite or Accept & Send
//
//  BACKEND ENDPOINTS:
//    POST /api/mail/generate/  { prompt, tone }          → { subject, body }
//    POST /api/mail/send/      { recipient, subject, body } → { sent: bool }
//
//  DEPENDENCIES:
//    SideBarLayout → components/Side_bar.jsx
// ===============================================================

import React, { useEffect, useMemo, useState } from "react";
import SideBarLayout from "../components/Side_bar";

// ─── API config ───────────────────────────────────────────────────────────────
const API_BASE = "http://127.0.0.1:8000/api/mail";

// Reads the JWT stored at login — returns null during SSR so the module is
// safe to import in server components without a ReferenceError.
function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

// ─── apiPost ─────────────────────────────────────────────────────────────────
// Minimal POST helper scoped to the mail API.
// Attaches the JWT Authorization header when a token is available.
// Throws a descriptive Error on non-2xx responses so callers can show the
// message directly in the chat (e.g. "Failed to generate email: …").
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
    data = {}; // 204 No Content or non-JSON response — treat as empty object
  }

  if (!res.ok) throw new Error(data?.detail || "Request failed");
  return data;
}

// ─── Tone options ─────────────────────────────────────────────────────────────
// Each object has:
//   key   → sent to the backend as the `tone` parameter in /generate/
//   label → shown in the tone-picker card and the header pill
const TONES = [
  { key: "angry_firm",           label: "Angry / Firm Tone"         },
  { key: "general_professional", label: "General / Professional Tone"},
  { key: "sweet_polite",         label: "Sweet / Polite Tone"       },
];

// ─── Welcome message ──────────────────────────────────────────────────────────
// Injected as the first assistant message on mount (only if the chat is empty).
// Explains the full flow so users know what to expect before they type anything.
const WELCOME_MESSAGE = `Hello! I'm Chrono Assist AI. I can help you with:

• Writing an email from your instructions
• Choosing a tone / mood
• Confirming recipient email
• Generating subject + body
• Rewriting the draft
• Sending the email

What would you like to do today?

Start by describing the email
Example: "Write an email about my absence on 19 Dec 2025 due to headache."`;


// ================================================================
//  Page component: EmailChatPage
//
//  State overview:
//    messages         — chat history rendered in the scroll area
//    step             — current position in the flow state machine
//    tone             — selected tone key (set in the "tone" step)
//    recipient        — confirmed recipient email (set in the "recipient" step)
//    subject / body   — generated draft content (set after /generate/ call)
//    loading          — true while any API call is in flight
//    recipientModal*  — controls the recipient-entry modal
// ================================================================
export default function EmailChatPage() {
  // Current user read from localStorage — used for the "You" label in chat bubbles
  const [user, setUser] = useState(null);

  // Chat messages: [{ role: "user" | "assistant", content: string }, ...]
  const [messages, setMessages] = useState([]);
  // Controlled input for the prompt composer at the bottom of the page
  const [prompt, setPrompt]     = useState("");
  // true while any backend call is in flight — disables inputs and buttons
  const [loading, setLoading]   = useState(false);

  // ── Flow state machine ──────────────────────────────────────────
  // idle      → waiting for the user to describe an email
  // tone      → tone-picker card is shown below the chat
  // recipient → recipient modal is open
  // draft     → draft action buttons (Rewrite / Accept & Send) are shown
  const [step, setStep] = useState("idle");
  // Selected tone key — null until the user picks one in the "tone" step
  const [tone, setTone] = useState(null);

  // ── Recipient modal state ───────────────────────────────────────
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  // Controlled value of the email input inside the modal
  const [recipientInput, setRecipientInput]         = useState("");

  // ── Confirmed draft data ────────────────────────────────────────
  // Set after a successful /generate/ call — passed to /send/ on Accept
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject]     = useState("");
  const [body, setBody]           = useState("");

  // Display name for user chat bubbles — derived from stored user object
  const lastUserName = useMemo(
    () => (user?.username ? user.username : "You"),
    [user]
  );

  // ── Hydrate user from localStorage (client-only) ────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("user");
    if (stored) {
      try   { setUser(JSON.parse(stored)); }
      catch { setUser(null); }
    }
  }, []);

  // ── Inject welcome message on first mount ───────────────────────
  // Guard prevents re-adding the message if the component re-mounts
  // (e.g. hot reload in dev) when messages already exist.
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [{ role: "assistant", content: WELCOME_MESSAGE }];
    });
  }, []);

  // ── resetFlow ───────────────────────────────────────────────────
  // Clears all flow-related state back to "idle" so the user can
  // start a brand-new email without refreshing the page.
  function resetFlow() {
    setStep("idle");
    setTone(null);
    setRecipient("");
    setRecipientInput("");
    setRecipientModalOpen(false);
    setSubject("");
    setBody("");
  }

  // ── onSubmitPrompt ──────────────────────────────────────────────
  // Called when the user submits the composer form in the "idle" step.
  // Adds the user message to chat, then immediately moves to the "tone" step
  // by appending an assistant message and showing the tone-picker card.
  async function onSubmitPrompt(e) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setPrompt("");

    // Prompt the user to choose a tone — the tone-picker card renders below
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "Choose the tone for this email:" },
    ]);
    setStep("tone");
  }

  // ── onTonePick ──────────────────────────────────────────────────
  // Called when the user clicks one of the tone buttons.
  // Records the selected tone, confirms it in chat, then opens the
  // recipient modal to collect the destination email address.
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

  // ── onConfirmRecipient ──────────────────────────────────────────
  // Called when the user clicks "Confirm" inside the recipient modal.
  // Closes the modal, then POSTs to /generate/ with the original user
  // prompt + chosen tone. On success, the generated subject + body are
  // stored in state and displayed in the chat as a draft message.
  async function onConfirmRecipient() {
    const email = recipientInput.trim();
    if (!email || !tone || loading) return;

    setRecipient(email);
    setRecipientModalOpen(false);

    // Walk backwards through the chat history to find the last user message,
    // which is the original email description that was submitted in the idle step.
    const lastPrompt =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";

    setLoading(true);
    try {
      const data = await apiPost("/generate/", { prompt: lastPrompt, tone });
      const subj = String(data?.subject || "");
      const bod  = String(data?.body    || "");

      setSubject(subj);
      setBody(bod);
      setStep("draft"); // show draft action buttons (Rewrite / Cancel / Accept & Send)

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
      resetFlow(); // return to idle so the user can try again
    } finally {
      setLoading(false);
    }
  }

  // ── onRewrite ───────────────────────────────────────────────────
  // Available in the "draft" step — calls /generate/ again with the
  // same prompt + tone to produce a fresh draft without re-entering
  // any details. The new draft replaces the current subject + body.
  async function onRewrite() {
    if (!tone || !recipient || loading) return;

    const lastPrompt =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";

    setLoading(true);
    try {
      const data = await apiPost("/generate/", { prompt: lastPrompt, tone });
      const subj = String(data?.subject || "");
      const bod  = String(data?.body    || "");

      setSubject(subj);
      setBody(bod);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Rewritten draft:"            },
        { role: "assistant", content: `Subject: ${subj}\n\n${bod}` },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Failed to rewrite: ${err?.message || "Unknown error"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ── onAcceptSend ────────────────────────────────────────────────
  // Available in the "draft" step — POSTs the confirmed recipient,
  // subject, and body to /send/. On success (sent === true), the flow
  // is reset to idle so the user can compose another email.
  async function onAcceptSend() {
    if (!recipient || !subject || !body || loading) return;

    setLoading(true);
    try {
      const data = await apiPost("/send/", { recipient, subject, body });

      if (data?.sent) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Sent to ${recipient}.` },
        ]);
        resetFlow();
      } else {
        // Backend returned 2xx but sent=false — surface this edge case in chat
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Not sent (sent=false)." },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Send failed: ${err?.message || "Unknown error"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ── onCancel ────────────────────────────────────────────────────
  // Available at any point during the flow — appends a "Cancelled."
  // message and resets everything back to idle.
  function onCancel() {
    setMessages((prev) => [...prev, { role: "assistant", content: "Cancelled." }]);
    resetFlow();
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <SideBarLayout>
      {/*
        Outer container uses h-[calc(100vh-40px)] so the chat fills the
        available viewport height and the composer stays pinned at the bottom.
        overflow-hidden + flex-col ensures only the chat scroll area scrolls,
        not the entire page.
      */}
      <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">

        {/* ── Top bar: title + active tone / recipient pills ── */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Email Assistant</h1>
            <p className="mt-1 text-sm text-slate-500">
              Describe the email → pick tone → confirm recipient → review draft.
            </p>
          </div>

          {/* Quick-glance pills showing current tone and recipient once set */}
          <div className="shrink-0 flex items-center gap-2">
            {tone && (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-indigo-50 text-indigo-700 ring-indigo-100">
                Tone: {TONES.find((x) => x.key === tone)?.label || tone}
              </span>
            )}
            {recipient && (
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-slate-50 text-slate-700 ring-slate-200">
                To: {recipient}
              </span>
            )}
          </div>
        </div>

        {/* ── Recipient modal — z-50 overlay shown in the "recipient" step ── */}
        {recipientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl p-6">

              {/* Modal header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Send to</div>
                  <div className="mt-1 text-sm text-slate-500">Enter recipient email address.</div>
                </div>
                {/* Header close — also cancels the entire flow */}
                <button
                  onClick={() => { setRecipientModalOpen(false); onCancel(); }}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 px-3 py-2 text-sm font-semibold transition disabled:opacity-60"
                  disabled={loading}
                >
                  Close
                </button>
              </div>

              {/* Email input */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Recipient</label>
                <input
                  value={recipientInput}
                  onChange={(e) => setRecipientInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                  placeholder="ram@gmail.com"
                />
              </div>

              {/* Modal action buttons */}
              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  onClick={() => { setRecipientModalOpen(false); onCancel(); }}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition disabled:opacity-60"
                  disabled={loading}
                >
                  Cancel
                </button>
                {/* Confirm disabled until the input has a non-empty value */}
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

        {/* ── Chat area + composer (only this inner section scrolls) ── */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Scrollable chat message list */}
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
                        // User messages are right-aligned; assistant messages left-aligned
                        isUser ? "ml-auto bg-white border-slate-200" : "mr-auto bg-white border-slate-200",
                      ].join(" ")}
                    >
                      {/* Bubble header: sender name + role badge */}
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

                      {/* Message body — whitespace-pre-wrap preserves line breaks in email drafts */}
                      <div className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Tone picker card — visible only in the "tone" step ── */}
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

              {/* ── Draft action card — visible only in the "draft" step ── */}
              {step === "draft" && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-w-3xl">
                  <div className="text-sm font-semibold text-slate-900">Draft actions</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* Cancel — resets the whole flow to idle */}
                    <button
                      onClick={onCancel}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    {/* Rewrite — calls /generate/ again with the same prompt + tone */}
                    <button
                      onClick={onRewrite}
                      disabled={loading}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition disabled:opacity-60"
                    >
                      Rewrite
                    </button>
                    {/* Accept & Send — calls /send/ with the confirmed draft */}
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

              {/* Loading indicator shown below the last message while an API call is in flight */}
              {loading && (
                <div className="mt-4 text-sm text-slate-500">AI is thinking…</div>
              )}
            </div>
          </div>

          {/* ── Composer — sticky at the bottom of the chat panel ── */}
          {/*
            The input and button are disabled whenever:
              • an API call is in flight (loading)
              • the step is not "idle" (user must complete the current flow first)
          */}
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
                  placeholder={
                    step === "idle"
                      ? "Describe the email you need..."
                      : "Finish the current email flow first..."
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 disabled:opacity-60"
                />
                <div className="mt-2 text-xs text-slate-500">
                  Tip: Be specific (date, reason, person, and what you want them to do).
                </div>
              </div>

              {/* Submit button — disabled until the prompt has content and step is idle */}
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