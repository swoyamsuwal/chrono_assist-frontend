"use client";

import React, { useEffect, useMemo, useState } from "react";
import SideBarLayout from "../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000";

function getAccessToken() {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

const WELCOME_MESSAGE = `Hello! I'm Chrono Assist AI. I can help you with:

• Asking questions about your uploaded documents
• Searching inside PDFs/DOCX/PPTX
• Using chat history to answer follow-up questions
• Explaining content in simple terms

What would you like to do today?

Start by asking a question
Example: “Summarize the main points from my uploaded PDF.”`;

export default function RagChatPage() {
  const [user, setUser] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // {role, content}
  const [loading, setLoading] = useState(false);

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

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const token = getAccessToken();
    if (!token) {
      console.error("No access token");
      return;
    }

    const newHistory = [...messages, { role: "user", content: text }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/file_upload/rag_chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: text,
          history: newHistory,
        }),
      });

      if (!res.ok) {
        console.error("RAG chat failed");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry — I couldn't answer that right now. Please try again." },
        ]);
        return;
      }

      const data = await res.json();
      const answer = data?.answer || "(no answer)";

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      console.error("Error calling rag_chat:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error while chatting. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SideBarLayout>
      {/* IMPORTANT: fixed height + flex column so composer never gets pushed */}
      <div className="w-full h-[calc(100vh-40px)] rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">RAG Chat</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ask questions about your uploaded documents and get answers with context.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-slate-50 text-slate-700 ring-slate-200">
              User: {lastUserName}
            </span>
          </div>
        </div>

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

              {loading ? <div className="mt-4 text-sm text-slate-500">AI is thinking…</div> : null}
            </div>
          </div>

          {/* Composer fixed at bottom */}
          <form onSubmit={sendMessage} className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">
            <div className="max-w-4xl mx-auto flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your documents..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                />
                <div className="mt-2 text-xs text-slate-500">
                  Tip: Mention the file/topic you want (e.g., “in the resume PDF…”).
                </div>
              </div>

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
