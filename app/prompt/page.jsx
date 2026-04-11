"use client";

// ===============================================================
//  app/rag-chat/page.jsx  (RAG Chat page)
//  A conversational interface that lets users ask questions about
//  their uploaded documents (PDFs, DOCX, PPTX).
//
//  HOW IT WORKS:
//    1. User types a question in the composer input
//    2. The full conversation history + the new question are sent
//       to the backend RAG endpoint
//    3. The backend retrieves relevant document chunks via vector
//       search and feeds them as context to the LLM
//    4. The LLM answer is appended to the chat as an assistant message
//
//  BACKEND ENDPOINT:
//    POST /file_upload/rag_chat/
//      body: { question: string, history: [{ role, content }] }
//      response: { answer: string }
//
//  STATE OVERVIEW:
//    user       — { username } read from localStorage (display name only)
//    input      — controlled text input (the composer field)
//    messages   — [{ role: "user"|"assistant", content: string }]
//                 Full conversation including the welcome message at index 0
//    loading    — true while the POST is in flight (disables send button)
// ===============================================================

import React, { useEffect, useMemo, useState } from "react";
import SideBarLayout from "../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000";

// Reads JWT from localStorage — returns null during SSR to avoid ReferenceError
function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

// ─── Welcome message ─────────────────────────────────────────────────────────
// Injected as the first assistant message when the chat is empty.
// Uses \n for line breaks — rendered via whitespace-pre-wrap in the message div.
// This is a client-only constant — it never reaches the backend.
const WELCOME_MESSAGE = `Hello! I'm Chrono Assist AI. I can help you with:

• Asking questions about your uploaded documents
• Searching inside PDFs/DOCX/PPTX
• Explaining content in simple terms

What would you like to do today?

Start by asking a question
Example: "Explain about a certain topic"`;

// ================================================================
//  Page component: RagChatPage
//
//  Layout structure (fixed-height flex column):
//    ┌─ Top bar (shrink-0) ─────────────────────────────────────┐
//    │  Title + User pill                                       │
//    ├─ Chat scroll area (flex-1, overflow-y-auto) ─────────────┤
//    │  Message bubbles (user right-aligned, AI left-aligned)   │
//    │  "AI is thinking…" indicator                             │
//    ├─ Composer (sticky bottom) ───────────────────────────────┤
//    │  Text input + Send button                                │
//    └──────────────────────────────────────────────────────────┘
//
//  The outer container uses h-[calc(100vh-40px)] + overflow-hidden
//  so only the chat area scrolls — the top bar and composer are
//  always visible regardless of message count.
// ================================================================
export default function RagChatPage() {
  // ── User display name ─────────────────────────────────────────────
  // Read from localStorage on mount — used only for the "User:" pill
  // in the header and the sender label on user messages.
  const [user, setUser] = useState(null);

  // ── Chat state ────────────────────────────────────────────────────
  const [input,    setInput]    = useState("");      // composer controlled input
  const [messages, setMessages] = useState([]);      // full conversation history
  const [loading,  setLoading]  = useState(false);   // true while POST is in flight

  // Derived display name — "You" fallback when no user is in localStorage
  const lastUserName = useMemo(() => (user?.username ? user.username : "You"), [user]);

  // ── Mount: read user from localStorage ───────────────────────────
  // Populates the "User: X" pill and the sender label on user bubbles.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); }
      catch { setUser(null); }
    }
  }, []);

  // ── Mount: inject the welcome message ────────────────────────────
  // Only runs when `messages` is empty — prevents re-injection on
  // hot-reloads or fast navigation back to this page.
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [{ role: "assistant", content: WELCOME_MESSAGE }];
    });
  }, []);

  // ================================================================
  //  Handler: sendMessage
  //  Called on form submit (Enter key or Send button click).
  //
  //  Flow:
  //    1. Validate: non-empty input + not already loading + token present
  //    2. Append user message to `messages` immediately (optimistic update)
  //    3. Clear the input so the composer feels responsive
  //    4. POST { question, history } to /file_upload/rag_chat/
  //    5a. On success → append AI answer to `messages`
  //    5b. On HTTP error or network error → append a friendly error message
  //       so the chat never ends on a silent failure
  // ================================================================
  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const token = getAccessToken();
    if (!token) { console.error("No access token"); return; }

    // ── Step 2: Optimistic user message ────────────────────────────
    // Appending immediately (before the API responds) makes the UI feel
    // snappy — the user sees their message right away without waiting.
    const newHistory = [...messages, { role: "user", content: text }];
    setMessages(newHistory);
    setInput("");       // Step 3: clear composer
    setLoading(true);

    try {
      // ── Step 4: POST to RAG chat endpoint ──────────────────────────
      // The full conversation history is sent so the backend LLM has
      // context from earlier turns (multi-turn conversation support).
      const res = await fetch(`${API_BASE}/file_upload/rag_chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: text,
          history:  newHistory,
        }),
      });

      if (!res.ok) {
        // ── Step 5b: HTTP error ───────────────────────────────────────
        // Backend returned 4xx / 5xx — show a friendly inline error
        // instead of leaving the chat stalled after the user's message.
        console.error("RAG chat failed");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry — I couldn't answer that right now. Please try again." },
        ]);
        return;
      }

      // ── Step 5a: Success — append the AI answer ───────────────────
      const data   = await res.json();
      const answer = data?.answer || "(no answer)";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);

    } catch (err) {
      // ── Step 5b: Network error (offline, CORS, DNS failure, etc.) ──
      console.error("Error calling rag_chat:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error while chatting. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <SideBarLayout>
      {/*
        Fixed-height container: h-[calc(100vh-40px)]
        The 40px offset accounts for the SideBarLayout wrapper padding.
        overflow-hidden clips child scroll areas to this boundary.
        flex flex-col makes the chat area expand to fill the remaining
        height between the top bar and the composer.
      */}
      <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">

        {/* ── Top bar: title + user pill ── */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">RAG Chat</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ask questions about your uploaded documents and get answers with context.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {/* Shows the logged-in username — "You" if not found in localStorage */}
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-slate-50 text-slate-700 ring-slate-200">
              User: {lastUserName}
            </span>
          </div>
        </div>

        {/* ── Chat area + composer (scroll chat only) ── */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* ── Chat scroll area ──
              flex-1 + min-h-0 allows this div to shrink when there are
              few messages and grow (with scroll) as messages accumulate.
              The composer stays pinned at the bottom in all cases.         */}
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
                        {/* "You" badge for user messages, "Assistant" for AI messages */}
                        <span className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                          isUser
                            ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
                            : "bg-slate-50 text-slate-600 ring-slate-200",
                        ].join(" ")}>
                          {isUser ? "You" : "Assistant"}
                        </span>
                      </div>

                      {/* Message body — whitespace-pre-wrap preserves line breaks
                          in the WELCOME_MESSAGE and in multi-paragraph AI responses */}
                      <div className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* "AI is thinking…" indicator — shown while the POST is in flight */}
              {loading && (
                <div className="mt-4 text-sm text-slate-500">AI is thinking…</div>
              )}
            </div>
          </div>

          {/* ── Composer — sticky at the bottom of the chat column ──
              sticky + border-t keeps it visually anchored below the chat
              scroll area without overlapping any message content.          */}
          <form
            onSubmit={sendMessage}
            className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 shrink-0"
          >
            <div className="max-w-4xl mx-auto flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your documents..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition"
                />
                {/* Usage tip — helps users form better queries for the RAG pipeline */}
                <div className="mt-2 text-xs text-slate-500">
                  Tip: Mention the file/topic you want (e.g., "in the resume PDF…").
                </div>
              </div>

              {/* Send button — disabled while a request is in flight or input is empty */}
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 h-[46px] px-5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SideBarLayout>
  );
}