// ===============================================================
//  components/Side_bar.jsx  (SideBarLayout)
//  App shell — wraps every authenticated page with a collapsible
//  sidebar and renders page content in the main area beside it
//
//  LAYOUT STRUCTURE:
//  ┌──────────┬─────────────────────────────────────────────────┐
//  │          │                                                 │
//  │ SIDEBAR  │              {children}                        │
//  │ (fixed)  │         (page content here)                    │
//  │          │                                                 │
//  └──────────┴─────────────────────────────────────────────────┘
//
//  SIDEBAR STATES:
//  1. Collapsed (w-16)  → icons only, no labels
//  2. Hover-expanded    → hover over the collapsed sidebar to peek
//  3. Pinned-open (w-56)→ user clicks the chevron to lock it open
//
//  State is persisted to localStorage (STORAGE_KEY) so the
//  sidebar remembers its pinned/collapsed state across page loads
//
//  RBAC FILTERING:
//  Nav items with a "permission" key are filtered through hasPermission()
//  so users only see pages they have access to (the sidebar is the
//  first line of defense against unauthorized navigation)
//
//  AVATAR STRATEGY:
//  1. Load cached profile_picture_url from localStorage immediately
//  2. Fetch fresh URL from /authapp/profile/ API in the background
//  3. Listen for "profileUpdated" custom events from the profile page
//     so the avatar updates live when the user changes their photo
// ===============================================================


// ---------------- Step 0: Imports ----------------
"use client"; // Next.js App Router — all hooks require client component

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { usePermissions } from "../hooks/usePermissions"; // RBAC hook
import {
  LayoutDashboard,
  Shield,
  Upload,
  MessageSquare,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react"; // Icon library


// ================================================================
//  Nav Item Registry
//  Each item defines its route, icon, and optional RBAC permission
//  Items with no "permission" key are always shown (e.g., Dashboard)
//  Items with "permission" are filtered by hasPermission() at render time
// ================================================================
const sidebarItems = [
  { name: "Dashboard",      href: "/dashboard",    icon: LayoutDashboard },
  { name: "Permission",     href: "/permission",   icon: Shield,        permission: { feature: "permission", action: "view"    } },
  { name: "File Upload",    href: "/file-upload",  icon: Upload,        permission: { feature: "files",      action: "view"    } },
  { name: "Prompt",         href: "/prompt",       icon: MessageSquare, permission: { feature: "prompt",     action: "execute" } },
  { name: "Mail",           href: "/mail",         icon: Mail,          permission: { feature: "mail",       action: "view"    } },
  { name: "Calendar",       href: "/calendar",     icon: Calendar,      permission: { feature: "calendar",   action: "view"    } },
  { name: "E-mail Campain", href: "/mail-campain", icon: Mail,          permission: { feature: "bulk_mail",  action: "view"    } },
];

// localStorage key for persisting the sidebar's pinned/collapsed state
const STORAGE_KEY = "sidebar-expanded";


// ================================================================
//  Utility: getInitials
//  Extracts 1-2 uppercase initials from a username or email address
//  Used as a fallback avatar when no profile picture is available
//
//  Examples:
//   "john.doe"        → "JD"
//   "sarah@gmail.com" → "S"
//   "alice smith"     → "AS"
// ================================================================
function getInitials(nameOrEmail) {
  if (!nameOrEmail) return "U";
  const s = String(nameOrEmail).trim();
  if (!s) return "U";
  // Split on spaces, @, dots, underscores, hyphens to get name parts
  const parts = s.split(/[\s@._-]+/).filter(Boolean);
  return (
    (parts[0]?.[0] || "U").toUpperCase() + (parts[1]?.[0] || "").toUpperCase()
  );
}


// ================================================================
//  Component: SideBarLayout
//  App shell wrapper — renders the sidebar + main content area
//  Used on every authenticated page:
//   <SideBarLayout>
//     <PageContent />
//   </SideBarLayout>
// ================================================================
export default function SideBarLayout({ children }) {

  // ---------------- Step 1: Routing Hooks ----------------
  const pathname = usePathname(); // Used to highlight the active nav item
  const router   = useRouter();   // Used for programmatic navigation (nav clicks, logout)

  // ---------------- Step 2: RBAC ----------------
  // hasPermission(feature, action) checks against the user's role's RolePermissions
  // Used to filter the sidebar nav items the user can see
  const { hasPermission } = usePermissions();

  // ---------------- Step 3: Sidebar State ----------------
  // expanded=null → initial render guard (prevents flash before localStorage loads)
  // expanded=true → sidebar is pinned open
  // expanded=false → sidebar is collapsed (icon-only mode)
  const [expanded,  setExpanded]  = useState(null);
  // hovered=true → sidebar temporarily opens when mouse enters (even when collapsed)
  const [hovered,   setHovered]   = useState(false);

  // ---------------- Step 4: User + Avatar State ----------------
  const [user,      setUser]      = useState(null);
  // avatarUrl is kept separate from user so it can be updated independently
  // (the profile page fires a "profileUpdated" event that only updates the avatar)
  const [avatarUrl, setAvatarUrl] = useState(null);


  // ================================================================
  //  Effect: Initialization
  //  Runs once on mount — handles four independent setup tasks:
  //   1. Restore sidebar pinned state from localStorage
  //   2. Load cached user object from localStorage
  //   3. Fetch fresh profile picture from the API in the background
  //   4. Register a listener for live avatar updates from the profile page
  // ================================================================
  useEffect(() => {

    // ---------------- Step 5a: Restore Sidebar State ----------------
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default to collapsed (false) if no preference has been saved yet
    if (stored === "true") setExpanded(true);
    else if (stored === "false") setExpanded(false);
    else setExpanded(false);

    // ---------------- Step 5b: Load Cached User ----------------
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Show the cached avatar immediately — avoids a blank avatar flash
        // while the API fetch in Step 5c is in flight
        if (parsed?.profile_picture_url) setAvatarUrl(parsed.profile_picture_url);
      } catch {
        setUser(null);
      }
    }

    // ---------------- Step 5c: Fetch Fresh Avatar from API ----------------
    // The cached URL may be stale if the user changed their photo on another device
    // We fetch in the background and update silently if a newer URL is returned
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetch("http://127.0.0.1:8000/authapp/profile/", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.profile_picture_url) {
            setAvatarUrl(data.profile_picture_url); // Update the displayed avatar
            // Also sync localStorage so the cache stays fresh for the next page load
            try {
              const existing = JSON.parse(localStorage.getItem("user") || "{}");
              localStorage.setItem(
                "user",
                JSON.stringify({ ...existing, profile_picture_url: data.profile_picture_url })
              );
            } catch {}
          }
        })
        .catch(() => {}); // Silently ignore network errors — cached avatar is still shown
    }

    // ---------------- Step 5d: Live Avatar Update Listener ----------------
    // profile/page.jsx dispatches a "profileUpdated" CustomEvent after
    // the user saves a new profile picture. This handler receives it and
    // updates the sidebar avatar immediately without a page reload.
    function onProfileUpdated(e) {
      const updated = e.detail ?? JSON.parse(localStorage.getItem("user") || "null");
      setUser(updated);
      if (updated?.profile_picture_url) setAvatarUrl(updated.profile_picture_url);
    }
    window.addEventListener("profileUpdated", onProfileUpdated);

    // Cleanup: remove the listener when the component unmounts
    return () => window.removeEventListener("profileUpdated", onProfileUpdated);
  }, []);


  // ---------------- Step 6: Derived State ----------------
  // isOpen → true if sidebar is pinned open OR currently being hovered
  // This single boolean drives all sidebar width and content visibility logic
  const isOpen  = Boolean(expanded || hovered);
  const username = user?.username || user?.email || "user";
  const initials = getInitials(username);

  // ---------------- Step 7: Render Guard ----------------
  // expanded===null means localStorage hasn't been read yet
  // Return null to prevent a flash of the wrong sidebar width on first render
  if (expanded === null) return null;


  // ---------------- Step 8: Sidebar Pin Toggle ----------------
  // Toggles between pinned-open and collapsed states
  // Persists to localStorage so the preference survives page navigation
  const handleToggleLock = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  const handleProfileClick = () => router.push("/profile");

  // ---------------- Step 9: Logout Handler ----------------
  // 1. Calls the Django logout endpoint to invalidate the server-side session
  // 2. Clears all auth data from localStorage
  // 3. Redirects to /login
  const handleLogout = async () => {
    try {
      await fetch("http://127.0.0.1:8000/authapp/logout/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Logout error:", e);
      // Even if the server call fails, we still clear local auth and redirect
    }
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setAvatarUrl(null);
    router.push("/login");
  };


  // ── Step 10: Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="flex">

        {/* ================================================================
            SIDEBAR
            fixed → sits outside the document flow, always visible on scroll
            transition-[width] → smooth expand/collapse animation
            w-56 when open, w-16 when collapsed (icon-only)
            Mouse enter/leave → toggles the hover-expanded state
            ================================================================ */}
        <aside
          className={`
            fixed left-0 top-0 bottom-0
            border-r border-gray-200 bg-white
            flex flex-col
            will-change-[width]
            transition-[width] duration-300 ease-in-out
            ${isOpen ? "w-56" : "w-16"}
          `}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >

          {/* ── Step 11: Brand / Logo ──
              Shows logo always; shows app name only when sidebar is open
              justify-center when collapsed keeps the logo centered in the narrow bar */}
          <div
            className={`
              flex items-center gap-2 px-3 py-3 border-b border-gray-100
              ${isOpen ? "justify-start" : "justify-center"}
            `}
          >
            <Image
              src="/vercel.png"
              alt="Vercel Logo"
              width={35}
              height={35}
              className="object-contain"
            />
            {isOpen && (
              <span className="text-sm font-semibold text-gray-900">
                Chrono Assist
              </span>
            )}
          </div>

          {/* ── Step 12: MENU Label + Pin Toggle Button ──
              "MENU" label only shown when sidebar is open (gives context to the nav)
              Chevron button: Left=collapse, Right=pin-open              */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            {isOpen ? (
              <span className="text-[11px] font-semibold tracking-[0.16em] text-gray-400">
                MENU
              </span>
            ) : (
              <span /> // Placeholder keeps the flexbox layout balanced
            )}
            <button
              type="button"
              onClick={handleToggleLock}
              className="
                inline-flex items-center justify-center
                h-7 w-7 rounded-full border text-gray-400
                border-gray-200 hover:border-gray-300 hover:text-gray-600
                bg-white shadow-sm transition-colors
              "
              title={expanded ? "Collapse sidebar" : "Keep sidebar open"}
            >
              {expanded ? (
                <ChevronLeft className="h-3.5 w-3.5" />   // Pinned open → show collapse arrow
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />  // Collapsed → show pin-open arrow
              )}
            </button>
          </div>

          {/* ── Step 13: Navigation Items ──
              Filtered by hasPermission() — items with no permission key always show
              Active item gets the solid indigo background
              Collapsed mode: icon only (grid-cols-1), open mode: icon + label (grid-cols-[40px_1fr]) */}
          <nav className="mt-1 px-2 flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {sidebarItems
                .filter(
                  (item) =>
                    !item.permission ||
                    hasPermission(item.permission.feature, item.permission.action)
                )
                .map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => router.push(item.href)}
                        className={`
                          w-full h-12 rounded-xl
                          transition-colors duration-150
                          ${active
                            ? "bg-[#4F39F6] text-white"             // Active: filled indigo
                            : "text-gray-700 hover:bg-[#4F39F6]/10" // Hover: light indigo tint
                          }
                          ${isOpen ? "px-2" : "px-0"}
                        `}
                      >
                        <span
                          className={`
                            h-full w-full grid items-center
                            ${isOpen
                              ? "grid-cols-[40px_1fr]"              // Open: icon slot + label
                              : "grid-cols-1 justify-items-center"  // Collapsed: icon only, centered
                            }
                          `}
                        >
                          {/* Icon container — slightly darker on active, indigo-colored on inactive */}
                          <span
                            className={`
                              h-10 w-10 rounded-xl grid place-items-center
                              ${active ? "bg-[#4F39F6]/90 text-white" : "text-[#4F39F6]"}
                            `}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          {/* Label — only rendered when sidebar is open */}
                          {isOpen && (
                            <span className="text-[13px] font-medium text-left">
                              {item.name}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </nav>


          {/* ── Step 14: Bottom Section — Profile + Sign Out ── */}
          <div className="border-t border-gray-100 p-2">

            {/* Profile Button
                Navigates to /profile when clicked
                Shows avatar image if available, initials fallback otherwise */}
            <button
              type="button"
              onClick={handleProfileClick}
              className={`
                w-full rounded-xl transition-colors
                hover:bg-gray-100
                ${isOpen ? "px-2 py-2" : "p-2"}
              `}
              title="Profile"
            >
              <span
                className={`
                  w-full grid items-center gap-x-3
                  ${isOpen
                    ? "grid-cols-[40px_1fr]"
                    : "grid-cols-1 justify-items-center"
                  }
                `}
              >
                {/* Avatar container — square with rounded corners (rounded-xl) */}
                <span className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 grid place-items-center overflow-hidden flex-shrink-0">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    // Regular <img> used instead of next/image here because
                    // avatarUrl is a dynamic API URL that may not be in next.config domains
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // Initials fallback — shown before avatar loads or if no picture is set
                    <span className="text-xs font-semibold text-gray-700">
                      {initials}
                    </span>
                  )}
                </span>

                {/* Username label — only shown when sidebar is open */}
                {isOpen && (
                  <span className="text-left leading-tight">
                    <div className="text-[13px] font-semibold text-gray-900">
                      Profile
                    </div>
                    <div className="text-[12px] text-gray-500">{username}</div>
                  </span>
                )}
              </span>
            </button>

            {/* Sign Out Button
                Red color scheme to visually distinguish from nav items
                Calls handleLogout() which clears auth state + redirects to /login */}
            <button
              type="button"
              onClick={handleLogout}
              className={`
                mt-1 w-full h-11 rounded-xl
                transition-colors duration-150
                text-red-600 hover:bg-red-50
                ${isOpen ? "px-2" : "px-0"}
              `}
              title="Sign out"
            >
              <span
                className={`
                  h-full w-full grid items-center
                  ${isOpen
                    ? "grid-cols-[40px_1fr]"
                    : "grid-cols-1 justify-items-center"
                  }
                `}
              >
                <span className="h-10 w-10 rounded-xl grid place-items-center text-red-600">
                  <LogOut className="h-4 w-4" />
                </span>
                {isOpen && (
                  <span className="text-[13px] font-medium text-left">
                    Sign out
                  </span>
                )}
              </span>
            </button>

          </div>
        </aside>


        {/* ================================================================
            MAIN CONTENT AREA
            ml-16 baseline → always offset by the collapsed sidebar width (w-16)
            lg:ml-56 when isOpen → offset increases to match the expanded sidebar
            transition-[margin-left] → smoothly slides content when sidebar opens/closes
            ================================================================ */}
        <main
          className={`
            flex-1 ml-16 transition-[margin-left] duration-300 ease-in-out
            ${isOpen ? "lg:ml-56" : "lg:ml-16"}
            w-full min-w-0
          `}
        >
          {/* Page content rendered here */}
          <div className="w-full px-3 sm:px-5 lg:px-8 py-6">{children}</div>
        </main>

      </div>
    </div>
  );
}