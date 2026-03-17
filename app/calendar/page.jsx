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
      className="group text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition"
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-slate-50 ring-1 ring-slate-200 grid place-items-center text-slate-700 group-hover:text-indigo-700 group-hover:ring-indigo-100 group-hover:bg-indigo-50 transition">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-0.5 text-xs text-slate-500">{description}</div>
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
  const [filterDate, setFilterDate] = useState(""); // "YYYY-MM-DD" or ""
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
      window.location.href = res.data.auth_url;
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
      setMessage(`Success: ${res.data.action} (${res.data.status})`);
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

  // ── Upcoming: default = 2 past + today + 3 future; filtered = all on that date ──
  const upcoming = useMemo(() => {
    const now = new Date();
    const todayStr = ymd(now);

    // Filter mode: show all events on the chosen date
    if (filterDate) {
      return events
        .filter((e) => ymd(e.start) === filterDate)
        .sort((a, b) => new Date(a.start) - new Date(b.start));
    }

    // Default mode: 2 most-recent past events
    const past = events
      .filter((e) => {
        const d = ymd(e.start);
        return d && d < todayStr;
      })
      .sort((a, b) => new Date(b.start) - new Date(a.start)) // newest-first
      .slice(0, 2)
      .reverse(); // back to chronological order

    // Today's events + next 3 future days with events
    const todayAndFuture = events
      .filter((e) => {
        const d = ymd(e.start);
        return d && d >= todayStr;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 4); // today + up to 3 future events

    return [...past, ...todayAndFuture];
  }, [events, filterDate]);

  function setPreset(text) {
    setPrompt(text);
  }

  function renderEventContent(arg) {
    if (arg.view.type === "dayGridMonth") {
      return <div className="fc-black-bar" aria-label={arg.event.title} />;
    }
    return (
      <>
        <b>{arg.timeText}</b>
        <i style={{ marginLeft: 6 }}>{arg.event.title}</i>
      </>
    );
  }

  // ── Helper: label a date relative to today ──────────────────────────────────
  function dateLabel(dateStr) {
    const todayStr = ymd(new Date());
    if (!dateStr) return "";
    if (dateStr === todayStr) return "Today";
    const diff =
      (new Date(dateStr) - new Date(todayStr)) / (1000 * 60 * 60 * 24);
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < 0) return `${Math.abs(Math.round(diff))} days ago`;
    return `In ${Math.round(diff)} days`;
  }

  return (
    <SideBarLayout>
      <div className="w-full h-[calc(100vh-24px)] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-3 shrink-0">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
              Calendar & Meetings
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Schedule and manage your meetings
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={handleConnect}
              className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              Connect Google Calendar
            </button>
          </div>
        </div>

        {/* ── Message banner ── */}
        {message ? (
          <div
            className={[
              "mb-3 rounded-2xl border px-4 py-2 text-xs shrink-0",
              message.toLowerCase().includes("error") ||
              message.toLowerCase().includes("failed")
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            ].join(" ")}
          >
            {message}
          </div>
        ) : null}

        {/* ── Main grid ── */}
        <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto] gap-4">

          {/* Top row: calendar widget + upcoming panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">

            {/* ── Mini calendar ── */}
            <div className="lg:col-span-4 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-0">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Calendar</div>
                <div className="text-xs text-slate-500">
                  {loading ? "Loading…" : " "}
                </div>
              </div>

              <div className="p-3">
                <div className="fc-apple-widget">
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{ left: "prev,next", center: "title", right: "" }}
                    fixedWeekCount={true}
                    showNonCurrentDates={true}
                    dayHeaders={true}
                    weekends={true}
                    events={events}
                    ref={calendarRef}
                    height="auto"
                    eventDisplay="block"
                    eventClick={handleEventClick}
                    dayCellClassNames={(arg) =>
                      eventDaysSet.has(arg.dateStr) ? ["has-event-day"] : []
                    }
                    // Clicking a day sets the filter to that date
                    dateClick={(arg) => {
                      setFilterDate((prev) =>
                        prev === arg.dateStr ? "" : arg.dateStr
                      );
                    }}
                    eventDidMount={(info) => {
                      info.el.setAttribute("data-fc-tooltip", info.event.title);
                    }}
                    eventContent={renderEventContent}
                  />
                </div>
              </div>
            </div>

            {/* ── Upcoming panel ── */}
            <div className="lg:col-span-8 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-0 flex flex-col">

              {/* Panel header with date filter */}
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 gap-3 flex-wrap">
                <div className="text-sm font-semibold text-slate-900">
                  {filterDate ? (
                    <span>
                      Events on{" "}
                      <span className="text-indigo-600">
                        {new Date(filterDate + "T00:00:00").toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </span>
                  ) : (
                    "Upcoming"
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Date picker */}
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                  />

                  {/* Clear filter */}
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate("")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Clear
                    </button>
                  )}

                  <div className="text-xs text-slate-500">
                    {upcoming.length} shown
                  </div>
                </div>
              </div>

              {/* Event list */}
              <div className="p-4 space-y-3 overflow-auto min-h-0">
                {upcoming.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                    <div className="text-sm font-semibold text-slate-900">
                      {filterDate ? "No events on this date" : "No upcoming meetings"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {filterDate
                        ? "Try a different date or clear the filter."
                        : "Create events using the prompt below."}
                    </div>
                  </div>
                ) : (
                  upcoming.map((e) => {
                    const when = fmtTimeRange(e.start, e.end);
                    const dayStr = ymd(e.start);
                    const label = dateLabel(dayStr);
                    const isToday = dayStr === ymd(new Date());
                    const isPast = dayStr < ymd(new Date());

                    return (
                      <div
                        key={e.id}
                        className={[
                          "rounded-2xl border px-4 py-3 hover:shadow-md transition",
                          isToday
                            ? "border-indigo-200 bg-indigo-50/40"
                            : isPast
                            ? "border-slate-100 bg-slate-50/60 opacity-70"
                            : "border-slate-200 bg-white",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {e.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {when ? `🕒 ${when}` : " "}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 truncate">
                              {e.extendedProps?.conferenceData?.conferenceSolution
                                ?.name ||
                                e.extendedProps?.location ||
                                " "}
                            </div>
                          </div>

                          {/* Relative date badge */}
                          <span
                            className={[
                              "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                              isToday
                                ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
                                : isPast
                                ? "bg-slate-100 text-slate-500 ring-slate-200"
                                : "bg-emerald-50 text-emerald-700 ring-emerald-100",
                            ].join(" ")}
                          >
                            {label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Bottom row: AI Prompt ── */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Prompt</div>
                <div className="text-xs text-slate-500">
                  Tell AI what you want. You can edit the preset text.
                </div>
              </div>

              <button
                onClick={sendPrompt}
                disabled={loading || !prompt.trim()}
                className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? "Processing..." : "Send"}
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              <div className="xl:col-span-7">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder={`Try: "Create a reminder on [date] at [time]: [reminder text]."`}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                />
              </div>

              <div className="xl:col-span-5 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-3">
                <PresetCard
                  title="Event"
                  description='Template: "Create event on ..."'
                  icon={
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
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
                  description='Template: "There is a meeting..."'
                  icon={
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
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
                    </svg>
                  }
                  onClick={() =>
                    setPreset(
                      "There is a meeting about [topic] on [date] at [time] with [attendees]. Location/Link: [zoom/google meet]."
                    )
                  }
                />

                <PresetCard
                  title="Reminder"
                  description="Quick reminder"
                  icon={
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path
                        d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                  onClick={() =>
                    setPreset(
                      "Create a reminder on [date] at [time]: [reminder text]."
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SideBarLayout>
  );
}
