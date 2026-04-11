// ===============================================================
//  app/calendar/page.jsx (CalendarPage)
//  Google Calendar integration UI with AI prompt interface
//
//  PAGE OVERVIEW:
//  ┌─────────────────────────────────────────────────────────┐
//  │ Header: title + "Connect Google Calendar" button        │
//  │ Message Banner: success/error feedback                  │
//  ├──────────────────┬──────────────────────────────────────┤
//  │ Mini Calendar    │ Upcoming Events Panel                │
//  │ (FullCalendar    │ (date-filtered list of events        │
//  │  dayGridMonth)   │  with Today/Tomorrow/In X days tags) │
//  ├──────────────────┴──────────────────────────────────────┤
//  │ AI Prompt Panel (only if calendar:execute permission)   │
//  │ Preset cards + free-text textarea + Send button         │
//  └─────────────────────────────────────────────────────────┘
//
//  PERMISSION MODEL:
//  calendar:view   → everyone who reaches this page (handled by sidebar)
//                    can see the calendar and upcoming events
//  calendar:execute→ required to see and use the AI prompt section
//
//  DATA FLOW:
//  Django /api/calendar/events/ → evToFullCalendar() → FullCalendar events[]
//  User types prompt → sendPrompt() → Django /api/calendar/ai-prompt/ → LLaMA
//  → Google Calendar API → fetchEvents() re-syncs the UI
// ===============================================================


// ---------------- Step 0: Imports ----------------
"use client"; // Next.js App Router — this component uses client-side hooks

import React, { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin    from "@fullcalendar/daygrid";       // Monthly grid view
import timeGridPlugin   from "@fullcalendar/timegrid";      // Week/day time grid (available but not default here)
import interactionPlugin from "@fullcalendar/interaction";  // Enables dateClick and eventClick
import SideBarLayout    from "../components/Side_bar";
import { usePermissions } from "../hooks/usePermissions";   // RBAC hook
import axios            from "axios";
import "./calendar.css"; // Apple widget styles + event bar + tooltip


const API_BASE = "http://127.0.0.1:8000";


// ================================================================
//  Utility 1: fmtTimeRange
//  Formats a start + end datetime pair into a human-readable time string
//  Used in the Upcoming panel event cards
//
//  Examples:
//   "10:00 AM - 11:00 AM"
//   "3:30 PM" (if no end time)
// ================================================================
function fmtTimeRange(start, end) {
  const s = start ? new Date(start) : null;
  const e = end   ? new Date(end)   : null;
  if (!s) return "";
  const opt = { hour: "numeric", minute: "2-digit" };
  const a = s.toLocaleTimeString([], opt); // e.g., "10:00 AM"
  const b = e ? e.toLocaleTimeString([], opt) : "";
  return b ? `${a} - ${b}` : a;
}


// ================================================================
//  Utility 2: ymd
//  Converts any date-like value to a "YYYY-MM-DD" string
//  Used as a consistent key for date comparisons throughout the page
//
//  Why not toISOString().slice(0,10)?
//  toISOString() returns UTC date — ymd() uses local date so
//  "today" matches the user's actual local calendar date
// ================================================================
function ymd(dateLike) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}


// ================================================================
//  Component: PresetCard
//  A clickable card that inserts a template prompt into the textarea
//  Shown in the AI Prompt section as quick-start shortcuts
//
//  Props:
//   title       → card heading (e.g., "Event", "Meeting", "Reminder")
//   description → subtitle shown under the title
//   icon        → inline SVG icon displayed in the card
//   onClick     → called when the card is clicked (inserts the preset)
// ================================================================
function PresetCard({ title, description, icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition"
    >
      <div className="flex items-start gap-3">
        {/* Icon container — teal tint on group hover */}
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


// ================================================================
//  Page Component: CalendarPage
//  Main calendar page — fetches events, renders the FullCalendar widget,
//  the upcoming events list, and (if permitted) the AI prompt panel
// ================================================================
export default function CalendarPage() {

  // ── Step 1: RBAC Permissions ──────────────────────────────────────────────
  const { hasPermission, loading: permLoading } = usePermissions();

  // canExecute gates the AI prompt panel
  // calendar:view is implicit (sidebar already handles page access)
  const canExecute = hasPermission("calendar", "execute");


  // ── Step 2: Component State ───────────────────────────────────────────────
  const [events, setEvents]         = useState([]);   // FullCalendar event objects
  const [prompt, setPrompt]         = useState("");   // AI prompt textarea value
  const [message, setMessage]       = useState("");   // Banner feedback message
  const [loading, setLoading]       = useState(false);// Disables buttons during API calls
  const [user, setUser]             = useState(null); // Logged-in user from localStorage
  const [filterDate, setFilterDate] = useState("");   // "YYYY-MM-DD" — filters upcoming list
  const calendarRef = useRef(null);                   // FullCalendar imperative API ref


  // ── Step 3: Axios Instance with JWT Interceptor ───────────────────────────
  // Creates a pre-configured axios instance that automatically attaches
  // the JWT access token from localStorage to every request's Authorization header
  const api = axios.create({ baseURL: API_BASE });

  api.interceptors.request.use(
    (config) => {
      if (typeof window !== "undefined") {
        // typeof window check → prevents SSR crash (Next.js runs on server too)
        const token = localStorage.getItem("accessToken");
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );


  // ── Step 4: Load User from localStorage ───────────────────────────────────
  // Reads the cached user object set during login
  // Used for display purposes (not for auth — that's handled by the JWT token)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
  }, []);


  // ── Step 5: Fetch Events on Mount ─────────────────────────────────────────
  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ── Step 6: Google Event → FullCalendar Format Mapper ─────────────────────
  // Google Calendar API returns events with nested start/end objects:
  //   { start: { dateTime: "...", date: "..." }, summary: "..." }
  // FullCalendar expects:
  //   { id, title, start, end, extendedProps }
  // extendedProps stores the original Google event for detail display
  function evToFullCalendar(ev) {
    const start = ev.start?.dateTime || ev.start?.date; // dateTime for timed events, date for all-day
    const end   = ev.end?.dateTime   || ev.end?.date;
    return {
      id: ev.id,
      title: ev.summary || "(no title)",
      start,
      end,
      extendedProps: ev, // Preserves full Google event (location, conferenceData, etc.)
    };
  }


  // ── Step 7: Fetch Events from Django ──────────────────────────────────────
  // Calls /api/calendar/events/ → Django loads Google Calendar API with stored credentials
  // Maps the raw Google events to FullCalendar format and updates state
  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await api.get(`/api/calendar/events/`);
      setEvents(res.data.map(evToFullCalendar));
      setMessage(""); // Clear any previous error message on success
    } catch (err) {
      console.error(err);
      // Show a helpful message — most common cause is no Google credentials yet
      setMessage(
        err?.response?.data?.detail ||
          "Error loading events. Connect your Google account."
      );
    } finally {
      setLoading(false);
    }
  }


  // ── Step 8: Start Google OAuth Flow ───────────────────────────────────────
  // Calls /api/calendar/google/login/ → Django generates the Google consent URL
  // We redirect the user's browser to that URL to complete OAuth
  // After consent, Google redirects to /google/callback/ → Django saves tokens
  // → browser is then sent back to Next.js /calendar?connected=1
  async function handleConnect() {
    try {
      const res = await api.get(`/api/calendar/google/login/`);
      window.location.href = res.data.auth_url; // Full-page redirect to Google consent screen
    } catch (err) {
      console.error(err);
      setMessage("Failed to get auth URL");
    }
  }


  // ── Step 9: Send AI Prompt ─────────────────────────────────────────────────
  // Posts the natural language prompt to /api/calendar/ai-prompt/
  // Django passes it to LLaMA → LLaMA returns a CalendarCommand JSON
  // → Django executes the command against Google Calendar API
  // → fetchEvents() re-syncs the FullCalendar widget with the latest data
  async function sendPrompt() {
    if (!prompt.trim()) return; // Prevent empty submissions
    setLoading(true);
    setMessage("Processing AI prompt...");
    try {
      const res = await api.post(`/api/calendar/ai-prompt/`, { prompt });
      // res.data.action → "create" | "update" | "delete" | "list"
      // res.data.status → "created" | "updated" | "deleted" | "ok"
      setMessage(`Success: ${res.data.action} (${res.data.status})`);
      setPrompt("");
      await fetchEvents(); // Re-fetch to reflect the AI-made change in the calendar
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.detail || "AI prompt error");
    } finally {
      setLoading(false);
    }
  }


  // ── Step 10: Delete Event on Calendar Click ────────────────────────────────
  // Called when the user clicks an event in the FullCalendar widget
  // Asks for confirmation, then calls the Django delete endpoint
  async function handleEventClick(clickInfo) {
    const ev = clickInfo.event;
    if (!confirm(`Delete event "${ev.title}"?`)) return; // Native confirm dialog
    setLoading(true);
    try {
      await api.delete(`/api/calendar/events/${ev.id}/delete/`);
      setMessage("Event deleted.");
      fetchEvents(); // Re-sync calendar after deletion
    } catch (err) {
      console.error(err);
      setMessage("Delete failed");
    } finally {
      setLoading(false);
    }
  }


  // ── Step 11: Compute Event Days Set ────────────────────────────────────────
  // A Set of "YYYY-MM-DD" strings for every day that has at least one event
  // Used by dayCellClassNames to add the .has-event-day CSS class
  // Memoized so it only recomputes when events[] changes (not on every render)
  const eventDaysSet = useMemo(() => {
    const set = new Set();
    for (const e of events) {
      const d = ymd(e.start);
      if (d) set.add(d);
    }
    return set;
  }, [events]);


  // ── Step 12: Compute Upcoming Events List ──────────────────────────────────
  // Derives the event list shown in the Upcoming panel from the full events[]
  //
  // When filterDate is set (user clicked a calendar cell or used the date picker):
  //   → show only events on that exact date, sorted by time
  //
  // When no filter:
  //   → show 2 most recent past events (for context) + 4 upcoming events
  //   → combined into a single chronological list
  //
  // Memoized — only recomputes when events[] or filterDate changes
  const upcoming = useMemo(() => {
    const now      = new Date();
    const todayStr = ymd(now);

    // ---------------- Filtered View ----------------
    if (filterDate) {
      return events
        .filter((e) => ymd(e.start) === filterDate)
        .sort((a, b) => new Date(a.start) - new Date(b.start));
    }

    // ---------------- Default View: Past 2 + Next 4 ----------------
    // Past events (most recent first, limited to 2) — reversed back to chronological
    const past = events
      .filter((e) => { const d = ymd(e.start); return d && d < todayStr; })
      .sort((a, b) => new Date(b.start) - new Date(a.start)) // Newest past first
      .slice(0, 2)
      .reverse(); // Put back in chronological order for the list

    // Today + future events (oldest first, limited to 4)
    const todayAndFuture = events
      .filter((e) => { const d = ymd(e.start); return d && d >= todayStr; })
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 4);

    return [...past, ...todayAndFuture];
  }, [events, filterDate]);


  // ── Step 13: Preset Prompt Inserter ───────────────────────────────────────
  // Called by PresetCard onClick — inserts a template string into the textarea
  // User can then edit the [placeholders] before sending
  function setPreset(text) { setPrompt(text); }


  // ── Step 14: FullCalendar Event Content Renderer ──────────────────────────
  // FullCalendar calls this for each event — controls what renders inside the cell
  //
  // dayGridMonth → render the compact .fc-black-bar div (thin horizontal bar)
  // Other views  → render time + title text (standard FullCalendar behavior)
  function renderEventContent(arg) {
    if (arg.view.type === "dayGridMonth") {
      // The CSS in calendar.css styles .fc-black-bar as a thin centered bar
      return <div className="fc-black-bar" aria-label={arg.event.title} />;
    }
    return (
      <>
        <b>{arg.timeText}</b>
        <i style={{ marginLeft: 6 }}>{arg.event.title}</i>
      </>
    );
  }


  // ── Step 15: Relative Date Label Generator ────────────────────────────────
  // Returns a human-readable label for a date relative to today
  // Used for the badge shown on each event card in the Upcoming panel
  //
  // Examples: "Today", "Tomorrow", "Yesterday", "In 3 days", "5 days ago"
  function dateLabel(dateStr) {
    const todayStr = ymd(new Date());
    if (!dateStr) return "";
    if (dateStr === todayStr) return "Today";
    // diff in whole days — positive = future, negative = past
    const diff = (new Date(dateStr) - new Date(todayStr)) / (1000 * 60 * 60 * 24);
    if (diff === 1)  return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < 0)    return `${Math.abs(Math.round(diff))} days ago`;
    return `In ${Math.round(diff)} days`;
  }


  // ── Step 16: Render ────────────────────────────────────────────────────────
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

          {/* Connect button — visible to everyone (no RBAC gate needed here)
              Clicking triggers the Google OAuth2 flow via handleConnect()   */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={handleConnect}
              className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition"
            >
              Connect Google Calendar
            </button>
          </div>
        </div>


        {/* ── Message Banner ──
            Shown when message state is non-empty
            Red styling for errors/failures, green for success
            Uses string matching on "error"/"failed" keywords for color   */}
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


        {/* ── Main Grid ──
            Layout:
             - 2 rows if canExecute (calendar+upcoming + AI prompt)
             - 1 row if not (calendar+upcoming only)
            grid-rows changes dynamically so the layout collapses cleanly
            when the AI panel is hidden                                    */}
        <div className={`flex-1 min-h-0 grid ${canExecute ? "grid-rows-[1fr_auto]" : "grid-rows-[1fr]"} gap-4`}>

          {/* ── Top Row: Mini Calendar + Upcoming Panel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">

            {/* ── Mini Calendar Panel (4/12 columns on lg) ── */}
            <div className="lg:col-span-4 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-0">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Calendar</div>
                <div className="text-xs text-slate-500">
                  {loading ? "Loading…" : " "}
                </div>
              </div>

              <div className="p-3">
                {/* .fc-apple-widget wrapper applies all the CSS overrides from calendar.css */}
                <div className="fc-apple-widget">
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    // Toolbar: only prev/next arrows + centered month title
                    // No view switcher (right: "") — keeps widget minimal
                    headerToolbar={{ left: "prev,next", center: "title", right: "" }}
                    fixedWeekCount={true}      // Always 6 rows → consistent widget height
                    showNonCurrentDates={true} // Show greyed-out prev/next month days
                    dayHeaders={true}
                    weekends={true}
                    events={events}
                    ref={calendarRef}
                    height="auto"
                    eventDisplay="block"
                    // Clicking an event → confirm delete dialog
                    eventClick={handleEventClick}
                    // Add .has-event-day class to cells that have events
                    // CSS in calendar.css gives these cells a subtle background tint
                    dayCellClassNames={(arg) =>
                      eventDaysSet.has(arg.dateStr) ? ["has-event-day"] : []
                    }
                    // Clicking a date cell → toggle filterDate
                    // If the same date is clicked again → clear the filter
                    dateClick={(arg) => {
                      setFilterDate((prev) =>
                        prev === arg.dateStr ? "" : arg.dateStr
                      );
                    }}
                    // Sets data-fc-tooltip on each event element
                    // The CSS ::after rule in calendar.css reads this to show a tooltip
                    eventDidMount={(info) => {
                      info.el.setAttribute("data-fc-tooltip", info.event.title);
                    }}
                    // Custom renderer: black bar in month view, time+title in other views
                    eventContent={renderEventContent}
                  />
                </div>
              </div>
            </div>


            {/* ── Upcoming Events Panel (8/12 columns on lg) ── */}
            <div className="lg:col-span-8 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-0 flex flex-col">

              {/* Panel header: dynamic title + date filter controls */}
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 gap-3 flex-wrap">
                <div className="text-sm font-semibold text-slate-900">
                  {/* Title changes to show the filtered date when a filter is active */}
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

                {/* Date filter input + clear button + result count */}
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                  />
                  {/* Clear button only shown when a filter is active */}
                  {filterDate && (
                    <button
                      onClick={() => setFilterDate("")}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Clear
                    </button>
                  )}
                  <div className="text-xs text-slate-500">{upcoming.length} shown</div>
                </div>
              </div>

              {/* Scrollable event list */}
              <div className="p-4 space-y-3 overflow-auto min-h-0">
                {upcoming.length === 0 ? (
                  // ── Empty State ──
                  // Message adapts based on whether a filter is active or not
                  // CTA message also changes based on canExecute permission
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                    <div className="text-sm font-semibold text-slate-900">
                      {filterDate ? "No events on this date" : "No upcoming meetings"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {filterDate
                        ? "Try a different date or clear the filter."
                        : canExecute
                          ? "Create events using the prompt below."
                          : "No events scheduled yet."}
                    </div>
                  </div>
                ) : (
                  // ── Event Cards ──
                  upcoming.map((e) => {
                    const when    = fmtTimeRange(e.start, e.end);
                    const dayStr  = ymd(e.start);
                    const label   = dateLabel(dayStr);       // "Today" / "In 3 days" / etc.
                    const isToday = dayStr === ymd(new Date());
                    const isPast  = dayStr < ymd(new Date());

                    return (
                      <div
                        key={e.id}
                        className={[
                          "rounded-2xl border px-4 py-3 hover:shadow-md transition",
                          // Three visual states: today (indigo), past (muted), future (white)
                          isToday
                            ? "border-indigo-200 bg-indigo-50/40"
                            : isPast
                            ? "border-slate-100 bg-slate-50/60 opacity-70" // Dimmed for past
                            : "border-slate-200 bg-white",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {/* Event title */}
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {e.title}
                            </div>
                            {/* Time range — empty space placeholder if no time */}
                            <div className="mt-1 text-xs text-slate-500">
                              {when ? `🕒 ${when}` : " "}
                            </div>
                            {/* Location or conference platform (Google Meet, Zoom, etc.)
                                Reads from conferenceData first, then location field       */}
                            <div className="mt-1 text-xs text-slate-500 truncate">
                              {e.extendedProps?.conferenceData?.conferenceSolution?.name ||
                                e.extendedProps?.location ||
                                " "}
                            </div>
                          </div>

                          {/* Relative date badge: Today (indigo) / past (grey) / future (green) */}
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


          {/* ── AI Prompt Panel (calendar:execute permission gate) ──
              Only rendered if the user's role has calendar:execute permission
              The grid layout collapses to 1 row automatically when this is hidden */}
          {canExecute && (
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Prompt</div>
                  <div className="text-xs text-slate-500">
                    Tell AI what you want. You can edit the preset text.
                  </div>
                </div>

                {/* Send button — disabled during loading or when prompt is empty */}
                <button
                  onClick={sendPrompt}
                  disabled={loading || !prompt.trim()}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {loading ? "Processing..." : "Send"}
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">

                {/* Textarea (7/12 columns on xl) */}
                <div className="xl:col-span-7">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    placeholder={`Try: "Create a reminder on [date] at [time]: [reminder text]."`}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300"
                  />
                </div>

                {/* Preset Cards (5/12 columns on xl, 3 columns on md) ──
                    Each card inserts a template prompt into the textarea
                    User edits the [placeholder] parts before hitting Send    */}
                <div className="xl:col-span-5 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-3">

                  {/* Event preset */}
                  <PresetCard
                    title="Event"
                    description='Template: "Create event on ..."'
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                        <path
                          d="M8 2v3M16 2v3M4 7h16M6 11h4M6 15h4M14 11h4M14 15h4M6 19h12"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                        />
                      </svg>
                    }
                    onClick={() =>
                      setPreset("Create event on [date] at [time] titled [title]. Notes: [details].")
                    }
                  />

                  {/* Meeting preset */}
                  <PresetCard
                    title="Meeting"
                    description='Template: "There is a meeting..."'
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                        <path
                          d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Z"
                          stroke="currentColor" strokeWidth="2"
                        />
                        <path
                          d="M6 11c1.66 0 3-1.57 3-3.5S7.66 4 6 4 3 5.57 3 7.5 4.34 11 6 11Z"
                          stroke="currentColor" strokeWidth="2"
                        />
                      </svg>
                    }
                    onClick={() =>
                      setPreset(
                        "There is a meeting about [topic] on [date] at [time] with [attendees]. Location/Link: [zoom/google meet]."
                      )
                    }
                  />

                  {/* Reminder preset */}
                  <PresetCard
                    title="Reminder"
                    description="Quick reminder"
                    icon={
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                        <path
                          d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z"
                          stroke="currentColor" strokeWidth="2" strokeLinejoin="round"
                        />
                      </svg>
                    }
                    onClick={() =>
                      setPreset("Create a reminder on [date] at [time]: [reminder text].")
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SideBarLayout>
  );
}