"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePermissions } from "../hooks/usePermissions"; // updated
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
} from "lucide-react";

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Permission", href: "/permission", icon: Shield },
  { name: "File Upload", href: "/file-upload", icon: Upload },
  { name: "Prompt", href: "/prompt", icon: MessageSquare },
  { name: "Mail", href: "/mail", icon: Mail, permission: { feature: "mail", action: "view" } }, // updated
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "E-mail Campain", href: "/mail-campain", icon: Mail },
];

const STORAGE_KEY = "sidebar-expanded";

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return "U";
  const s = String(nameOrEmail).trim();
  if (!s) return "U";
  const parts = s.split(/[\s@._-]+/).filter(Boolean);
  return (
    (parts[0]?.[0] || "U").toUpperCase() + (parts[1]?.[0] || "").toUpperCase()
  );
}

export default function SideBarLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission } = usePermissions(); // updated

  const [expanded, setExpanded] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setExpanded(true);
    else if (stored === "false") setExpanded(false);
    else setExpanded(false);

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const isOpen = Boolean(expanded || hovered);

  const username = user?.username || user?.email || "user";

  const avatarUrl =
    user?.avatar ||
    user?.profile_picture ||
    user?.profilePicture ||
    user?.image ||
    null;

  const initials = getInitials(username);

  if (expanded === null) return null;

  const handleToggleLock = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  const handleLogout = async () => {
    try {
      await fetch("http://127.0.0.1:8000/authapp/logout/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("Logout error:", e);
    }

    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    setUser(null);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="flex">
        {/* SIDEBAR */}
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
          {/* Brand */}
          <div
            className={`
              flex items-center gap-2 px-3 py-3 border-b border-gray-100
              ${isOpen ? "justify-start" : "justify-center"}
            `}
          >
            <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-sm font-semibold">
              AI
            </div>
            {isOpen && (
              <span className="text-sm font-semibold text-gray-900">
                Chrono Assist
              </span>
            )}
          </div>

          {/* MENU + pin */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            {isOpen ? (
              <span className="text-[11px] font-semibold tracking-[0.16em] text-gray-400">
                MENU
              </span>
            ) : (
              <span />
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
                <ChevronLeft className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* NAV */}
          <nav className="mt-1 px-2 flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {sidebarItems
                .filter( // updated
                  (item) =>
                    !item.permission ||
                    hasPermission(item.permission.feature, item.permission.action)
                ) // updated
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
                          ${
                            active
                              ? "bg-gray-900 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }
                          ${isOpen ? "px-2" : "px-0"}
                        `}
                      >
                        <span
                          className={`
                            h-full w-full grid items-center
                            ${
                              isOpen
                                ? "grid-cols-[40px_1fr]"
                                : "grid-cols-1 justify-items-center"
                            }
                          `}
                        >
                          <span
                            className={`
                              h-10 w-10 rounded-xl grid place-items-center
                              ${
                                active
                                  ? "bg-gray-800 text-white"
                                  : "text-gray-500"
                              }
                            `}
                          >
                            <Icon className="h-4 w-4" />
                          </span>

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

          {/* Bottom: Profile + Sign out */}
          <div className="border-t border-gray-100 p-2">
            {/* Profile row */}
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
                  ${
                    isOpen
                      ? "grid-cols-[40px_1fr]"
                      : "grid-cols-1 justify-items-center"
                  }
                `}
              >
                <span className="h-10 w-10 rounded-xl bg-gray-100 border border-gray-200 grid place-items-center overflow-hidden">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-gray-700">
                      {initials}
                    </span>
                  )}
                </span>

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

            {/* Sign out row */}
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
                  ${
                    isOpen
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

        {/* CONTENT */}
        <main
          className={`
            flex-1 ml-16 transition-[margin-left] duration-300 ease-in-out
            ${isOpen ? "lg:ml-56" : "lg:ml-16"}
            w-full min-w-0
          `}
        >
          {/* IMPORTANT: removed max-w-6xl mx-auto so children can take full width */}
          <div className="w-full px-3 sm:px-5 lg:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}