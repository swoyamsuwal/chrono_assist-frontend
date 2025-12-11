"use client";

import React, { useState, useEffect } from "react";
import SideBarLayout from "../components/Side_bar";

const API_BASE = "http://127.0.0.1:8000";

function getAccessToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("accessToken")
    : null;
}

export default function RagChatPage() {
  const [user, setUser] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // {role, content}
  const [loading, setLoading] = useState(false);

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
        return;
      }

      const data = await res.json();
      const answer = data.answer || "(no answer)";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: answer },
      ]);
    } catch (err) {
      console.error("Error calling rag_chat:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SideBarLayout>
      <div className="flex flex-col h-full max-h-[calc(100vh-4rem)] bg-gray-800 border border-gray-700 rounded-lg">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-10">
              Ask a question about your uploaded documents.
            </div>
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={
                "max-w-3xl px-3 py-2 rounded " +
                (m.role === "user"
                  ? "bg-blue-600 text-white ml-auto"
                  : "bg-gray-700 text-gray-100 mr-auto")
              }
            >
              <div className="text-xs mb-1 opacity-70">
                {m.role === "user" ? (user ? user.username : "You") : "AI"}
              </div>
              <div className="whitespace-pre-wrap text-sm">
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-gray-400 text-sm">AI is thinking…</div>
          )}
        </div>

        <form
          onSubmit={sendMessage}
          className="border-t border-gray-700 p-3 flex gap-2 bg-gray-900"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your documents..."
            className="flex-1 px-3 py-2 rounded bg-gray-800 text-gray-100 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-600"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </SideBarLayout>
  );
}
