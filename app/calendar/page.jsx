"use client";

import React, { useEffect, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import SideBarLayout from "../components/Side_bar";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const calendarRef = useRef();

  // 1. Setup Axios instance with Interceptor for Auth
  const api = axios.create({
    baseURL: API_BASE,
  });

  api.interceptors.request.use(
    (config) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("accessToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Load user from localStorage
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

  useEffect(() => {
    fetchEvents();
  }, []);

  function evToFullCalendar(ev) {
    let start = ev.start?.dateTime || ev.start?.date;
    let end = ev.end?.dateTime || ev.end?.date;
    return {
      id: ev.id,
      title: ev.summary || "(no title)",
      start,
      end,
      extendedProps: ev,
    };
  }

  async function fetchEvents() {
    setLoading(true);
    try {
      // Use 'api' instead of 'axios' to include Token
      const res = await api.get(`/api/calendar/events/`);
      setEvents(res.data.map(evToFullCalendar));
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.detail || "Error loading events. Connect your Google account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      // Use 'api' so backend knows WHO is connecting
      const res = await api.get(`/api/calendar/google/login/`);
      const auth_url = res.data.auth_url;
      window.location.href = auth_url;
    } catch (err) {
      console.error(err);
      setMessage("Failed to get auth URL");
    }
  }

  async function sendPrompt() {
    if (!prompt.trim()) return;
    setLoading(true);
    setMessage("Processing AI prompt...");
    try {
      const res = await api.post(`/api/calendar/ai-prompt/`, { prompt });
      // Format the result nicely
      const action = res.data.action;
      const status = res.data.status;
      setMessage(`Success: ${action} (${status})`);
      setPrompt("");
      await fetchEvents();
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.detail || "AI prompt error");
    } finally {
      setLoading(false);
    }
  }

  async function handleEventClick(clickInfo) {
    const ev = clickInfo.event;
    if (!confirm(`Delete event "${ev.title}"?`)) return;
    setLoading(true);
    try {
      await api.delete(`/api/calendar/events/${ev.id}/delete/`);
      setMessage("Event deleted.");
      fetchEvents();
    } catch (err) {
      console.error(err);
      setMessage("Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SideBarLayout>
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-white">ChronoAssist — Calendar</h1>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition"
          >
            Connect Google Calendar
          </button>
          <button
            onClick={fetchEvents}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition"
          >
            Refresh
          </button>
        </div>

        {/* Message / Error Display */}
        {message && (
            <div className={`p-3 rounded ${message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") ? "bg-red-900/50 text-red-200 border border-red-700" : "bg-green-900/50 text-green-200 border border-green-700"}`}>
                {message}
            </div>
        )}

        {/* Calendar */}
        <div className="bg-gray-800 rounded-lg p-4 shadow-md border border-gray-700">
          {loading && <div className="text-gray-400 mb-2">Loading events...</div>}
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            eventClick={handleEventClick}
            ref={calendarRef}
            height="auto"
            className="bg-gray-800 text-white rounded"
          />
        </div>

        {/* AI Prompt Section */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-white">AI Prompt (natural language)</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder={`Try: "Create meeting with Alice tomorrow at 3pm about product demo"`}
            className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={sendPrompt}
              disabled={loading || !prompt.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:bg-gray-600 transition"
            >
              {loading ? "Processing..." : "Send Prompt"}
            </button>
          </div>
        </div>
      </div>
    </SideBarLayout>
  );
}
