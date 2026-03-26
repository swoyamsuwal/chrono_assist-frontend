"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SideBarLayout from "../../../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000";

function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

// ── Scroll helper ─────────────────────────────────────────────────────────────
function useAutoScroll(dep) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [dep]);
  return ref;
}

// ── Welcome message ───────────────────────────────────────────────────────────
function buildWelcome(filename) {
  return `Hello! I'm Chrono Assist AI — focused on this document:

📄 ${filename || "Your document"}

I can help you:
• Summarize sections
• Answer specific questions from the content
• Explain terms or concepts in simple words
• Find details you're looking for

I will ONLY use content from this file — not any other uploaded documents.

Example: "What are the main points in this document?"`;
}

export default function DocChatPage() {
  const { id: documentId } = useParams();
  const router = useRouter();

  const [user, setUser]       = useState(null);
  const [docInfo, setDocInfo] = useState(null);   // { filename, is_embedded }
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState(null);

  const scrollRef = useAutoScroll(messages);
  const lastUserName = useMemo(() => user?.username || "You", [user]);

  // ── Load user from localStorage ──
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
  }, []);

  // ── Validate document: must exist + be embedded ──
  useEffect(() => {
    if (!documentId) return;
    const token = getAccessToken();

    fetch(`${API_BASE}/file_upload/preview_file/${documentId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setInitError(data.error);
          return;
        }
        if (!data.is_embedded) {
          setInitError("This document has not been embedded yet. Please embed it first before chatting.");
          return;
        }
        setDocInfo({ filename: data.filename, mime_type: data.mime_type });
        // Set welcome message with actual filename
        setMessages([
          { role: "assistant", content: buildWelcome(data.filename) },
        ]);
      })
      .catch(() => setInitError("Failed to load document info."));
  }, [documentId]);

  // ── Send message ──
  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const token = getAccessToken();
    if (!token) return;

    const newHistory = [...messages, { role: "user", content: text }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/file_upload/doc_chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          document_id: documentId,
          question:    text,
          history:     newHistory,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errData.error || "Sorry — I couldn't answer that. Please try again.",
          },
        ]);
        return;
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "(no answer)" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ── Error screen ──
  if (initError) {
    return (
      <SideBarLayout>
        <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-4 text-center px-6">
          <span className="text-5xl">⚠️</span>
          <p className="text-slate-700 font-medium">{initError}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
          >
            ← Go back
          </button>
        </div>
      </SideBarLayout>
    );
  }

  return (
    <SideBarLayout>
      <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-lg"
              title="Back to files"
            >
              ←
            </button>

            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 flex items-center gap-2">
                Document Chat
                {docInfo && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 truncate max-w-[240px]">
                    📄 {docInfo.filename}
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Chatting with a single document — no other files are used.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-slate-50 text-slate-700 ring-slate-200">
              User: {lastUserName}
            </span>
          </div>
        </div>

        {/* ── Chat area + Composer ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* scrollable chat */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-6 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              <div className="space-y-3">
                {messages.map((m, idx) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={idx}
                      className={[
                        "max-w-3xl rounded-2xl border px-4 py-3 shadow-sm",
                        isUser
                          ? "ml-auto bg-white border-slate-200"
                          : "mr-auto bg-white border-slate-200",
                      ].join(" ")}
                    >
                      {/* bubble header */}
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

                      {/* message body */}
                      <div className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>

              {loading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse delay-150">●</span>
                  <span className="animate-pulse delay-300">●</span>
                  <span className="ml-1">AI is thinking…</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Composer ── */}
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
                  placeholder={`Ask about "${docInfo?.filename || "this document"}"…`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                />
                <div className="mt-2 text-xs text-slate-500">
                  This chat only uses content from the selected document.
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 h-[46px] px-5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SideBarLayout>
  );
}
