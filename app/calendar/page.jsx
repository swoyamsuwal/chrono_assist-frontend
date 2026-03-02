"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import SideBarLayout from "../components/Side_bar";
import axios from "axios";
import "./calendar.css";

const API_BASE = "http://127.0.0.1:8000";

function fmtTimeRange(start, end) {
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  if (!s) return "";
  const opt = { hour: "numeric", minute: "2-digit" };
  const a = s.toLocaleTimeString([], opt);
  const b = e ? e.toLocaleTimeString([], opt) : "";
  return b ? `${a} - ${b}` : a;
}

function ymd(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function PresetCard({ title, description, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition"
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-slate-50 ring-1 ring-slate-200 grid place-items-center text-slate-700 group-hover:text-indigo-700 group-hover:ring-indigo-100 group-hover:bg-indigo-50 transition">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{description}</div>
        </div>
      </div>
    </button>
  );
}

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const calendarRef = useRef(null);

  const api = axios.create({ baseURL: API_BASE });

  api.interceptors.request.use(
    (config) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("accessToken");
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function evToFullCalendar(ev) {
    const start = ev.start?.dateTime || ev.start?.date;
    const end = ev.end?.dateTime || ev.end?.date;

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
      const res = await api.get(`/api/calendar/events/`);
      setEvents(res.data.map(evToFullCalendar));
      setMessage("");
    } catch (err) {
      console.error(err);
      setMessage(
        err?.response?.data?.detail ||
          "Error loading events. Connect your Google account."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
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

  const eventDaysSet = useMemo(() => {
    const set = new Set();
    for (const e of events) {
      const d = ymd(e.start);
      if (d) set.add(d);
    }
    return set;
  }, [events]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const list = events
      .map((e) => ({
        ...e,
        _startMs: e.start ? new Date(e.start).getTime() : 0,
      }))
      .filter((e) => e._startMs && e._startMs >= now - 5 * 60 * 1000)
      .sort((a, b) => a._startMs - b._startMs);

    return list.slice(0, 8);
  }, [events]);

  function setPreset(text) {
    setPrompt(text);
    const el = document.getElementById("ai-prompt");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // FullCalendar custom render: month view => black bar only (no text) [page:1]
  function renderEventContent(arg) {
    if (arg.view.type === "dayGridMonth") {
      return <div className="fc-black-bar" aria-label={arg.event.title} />;
    }

    // Keep normal-ish title in week/day views
    return (
      <>
        <b>{arg.timeText}</b>
        <i style={{ marginLeft: 6 }}>{arg.event.title}</i>
      </>
    );
  }

  return (
    <SideBarLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
              Calendar & Meetings
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Schedule and manage your meetings
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={handleConnect}
              className="rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              Connect Google Calendar
            </button>
            <button
              onClick={fetchEvents}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Message */}
        {message ? (
          <div
            className={[
              "mb-6 rounded-2xl border px-4 py-3 text-sm",
              message.toLowerCase().includes("error") ||
              message.toLowerCase().includes("failed")
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            ].join(" ")}
          >
            {message}
          </div>
        ) : null}

        {/* Main 2-column area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar card */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">
                Calendar
              </div>
              <div className="text-sm text-slate-500">
                {loading ? "Loading…" : " "}
              </div>
            </div>

            <div className="p-4">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                events={events}
                ref={calendarRef}
                height="auto"
                eventDisplay="block"
                eventClick={handleEventClick}
                dayCellClassNames={(arg) => {
                  const key = arg.dateStr;
                  return eventDaysSet.has(key) ? ["has-event-day"] : [];
                }}
                eventDidMount={(info) => {
                  // Tooltip text shown on hover via CSS below
                  info.el.setAttribute("data-fc-tooltip", info.event.title);
                }}
                eventContent={renderEventContent} // custom rendering (black bar in month) [page:1]
              />
            </div>
          </div>

          {/* Upcoming meetings card */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="text-base font-semibold text-slate-900">
                Upcoming Meetings
              </div>
              <div className="text-sm text-slate-500">
                {upcoming.length} upcoming
              </div>
            </div>

            <div className="p-5 space-y-4">
              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                  <div className="text-sm font-semibold text-slate-900">
                    No upcoming meetings
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Connect your Google Calendar or create an event using the
                    prompt below.
                  </div>
                </div>
              ) : (
                upcoming.map((e) => {
                  const when = fmtTimeRange(e.start, e.end);
                  const dateLabel = e.start
                    ? new Date(e.start).toLocaleDateString([], {
                        month: "short",
                        day: "2-digit",
                      })
                    : "";

                  return (
                    <div
                      key={e.id}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-semibold text-slate-900 truncate">
                            {e.title}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {when ? `🕒 ${when}` : " "}
                          </div>
                          <div className="mt-1 text-sm text-slate-500 truncate">
                            {e.extendedProps?.conferenceData?.conferenceSolution
                              ?.name ||
                              e.extendedProps?.location ||
                              " "}
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 px-3 py-1 text-xs font-semibold">
                          {dateLabel || "Soon"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Prompt section */}
        <div
          id="ai-prompt"
          className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-slate-900">
                Prompt
              </div>
              <div className="text-sm text-slate-500">
                Tell AI what you want. You can edit the preset text.
              </div>
            </div>

            <button
              onClick={sendPrompt}
              disabled={loading || !prompt.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? "Processing..." : "Send"}
            </button>
          </div>

          <div className="p-5">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder={`Try: "Create meeting with Alice tomorrow at 3pm about product demo"`}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
            />
          </div>
        </div>

        {/* Presets */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <PresetCard
            title="Event"
            description='Sets a template like: "Create event on ..."'
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path
                  d="M8 2v3M16 2v3M4 7h16M6 11h4M6 15h4M14 11h4M14 15h4M6 19h12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            }
            onClick={() =>
              setPreset(
                "Create event on [date] at [time] titled [title]. Notes: [details]."
              )
            }
          />

          <PresetCard
            title="Meeting"
            description='Sets a template like: "There a meeting about ... on ..."'
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path
                  d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M6 11c1.66 0 3-1.57 3-3.5S7.66 4 6 4 3 5.57 3 7.5 4.34 11 6 11Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M6 13c-2.21 0-4 1.34-4 3v2h8v-2c0-1.66-1.79-3-4-3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M16 13c-2.21 0-4 1.34-4 3v2h10v-2c0-1.66-1.79-3-4-3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            }
            onClick={() =>
              setPreset(
                "There is a meeting about company growth on 12 Dec at 2:00 PM with [attendees]. Location/Link: [zoom/google meet]."
              )
            }
          />

          <PresetCard
            title="Reminder"
            description="Quickly draft a reminder event."
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path
                  d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            }
            onClick={() =>
              setPreset("Create a reminder on [date] at [time]: [reminder text].")
            }
          />
        </div>
      </div>
    </SideBarLayout>
  );
}
