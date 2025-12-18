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

    setMessages((prev) => [...prev, { role: "assistant", content: "Choose the tone for this email:" }]);
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
        { role: "assistant", content: `Failed to generate email: ${err?.message || "Unknown error"}` },
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
      <div className="flex flex-col h-full max-h-[calc(100vh-4rem)] bg-gray-800 border border-gray-700 rounded-lg relative">
        {recipientModalOpen && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-[min(520px,92vw)]">
              <div className="text-gray-100 font-semibold mb-2">Send to</div>
              <div className="text-gray-400 text-sm mb-3">Enter recipient email address:</div>

              <input
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-800 text-gray-100 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ram@gmail.com"
              />

              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => {
                    setRecipientModalOpen(false);
                    onCancel();
                  }}
                  className="px-4 py-2 rounded bg-gray-700 text-gray-100 hover:bg-gray-600"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmRecipient}
                  className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-600"
                  disabled={loading || !recipientInput.trim()}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-10">
              Type what email you want to send, for example:&nbsp;
              &quot;Write an email about my absence on 19 Dec 2025 due to headache.&quot;
            </div>
          )}

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={
                "max-w-3xl px-3 py-2 rounded " +
                (m.role === "user" ? "bg-blue-600 text-white ml-auto" : "bg-gray-700 text-gray-100 mr-auto")
              }
            >
              <div className="text-xs mb-1 opacity-70">{m.role === "user" ? lastUserName : "Email AI"}</div>
              <div className="whitespace-pre-wrap text-sm">{m.content}</div>
            </div>
          ))}

          {step === "tone" && (
            <div className="bg-gray-900 border border-gray-700 rounded p-3 max-w-3xl">
              <div className="text-gray-200 text-sm mb-2">Select tone:</div>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => onTonePick(t.key)}
                    disabled={loading}
                    className="px-3 py-2 rounded bg-gray-700 text-gray-100 hover:bg-gray-600"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "draft" && (
            <div className="bg-gray-900 border border-gray-700 rounded p-3 max-w-3xl">
              <div className="text-gray-200 text-sm mb-2">What to do with this draft?</div>
              <div className="flex gap-2">
                <button onClick={onCancel} disabled={loading} className="px-4 py-2 rounded bg-gray-700 text-gray-100 hover:bg-gray-600">
                  Cancel
                </button>
                <button onClick={onRewrite} disabled={loading} className="px-4 py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700">
                  Rewrite
                </button>
                <button onClick={onAcceptSend} disabled={loading} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">
                  Accept &amp; Send
                </button>
              </div>
            </div>
          )}

          {loading && <div className="text-gray-400 text-sm">AI is thinking…</div>}
        </div>

        <form onSubmit={onSubmitPrompt} className="border-t border-gray-700 p-3 flex gap-2 bg-gray-900">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading || step !== "idle"}
            placeholder={step === "idle" ? "Describe the email you need..." : "Finish the current email flow first..."}
            className="flex-1 px-3 py-2 rounded bg-gray-800 text-gray-100 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || step !== "idle" || !prompt.trim()}
            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-600"
          >
            {loading ? "Working..." : "Start"}
          </button>
        </form>
      </div>
    </SideBarLayout>
  );
}
