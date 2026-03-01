"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
// import Header from "./Header_second";
import {
  LayoutDashboard,
  Shield,
  Upload,
  MessageSquare,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Permission", href: "/permission", icon: Shield },
  { name: "File Upload", href: "/file-upload", icon: Upload },
  { name: "Prompt", href: "/prompt", icon: MessageSquare },
  { name: "Mail", href: "/mail", icon: Mail },
  { name: "Calendar", href: "/calendar", icon: Calendar },
];

const STORAGE_KEY = "sidebar-expanded";

export default function SideBarLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [expanded, setExpanded] = useState(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setExpanded(true);
    else if (stored === "false") setExpanded(false);
    else setExpanded(false);
  }, []);

  if (expanded === null) return null;

  const isOpen = expanded || hovered;

  const handleToggleLock = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="fixed top-0 left-0 z-40 w-full bg-white border-b border-gray-200">
        {/* <Header /> */}
      </div>

      <div className="pt-[1px] flex">
        <aside
          className={`
            fixed left-0 top-[1px] bottom-0
            border-r border-gray-200 bg-white
            flex flex-col
            transition-[width] duration-200 ease-out
            ${isOpen ? "w-56" : "w-16"}
          `}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Logo */}
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

          {/* Menu + toggle */}
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
              className={`
                inline-flex items-center justify-center
                h-7 w-7 rounded-full border text-gray-400
                border-gray-200 hover:border-gray-300 hover:text-gray-600
                bg-white shadow-sm transition-colors
              `}
              title={expanded ? "Collapse sidebar" : "Keep sidebar open"}
            >
              {expanded ? (
                <ChevronLeft className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Nav */}
          <nav className="mt-1 px-2 flex-1 overflow-y-auto">
            <ul className="space-y-1">
              {sidebarItems.map((item) => {
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
                        ${active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}
                        ${isOpen ? "px-2" : "px-0"}
                      `}
                    >
                      {/* This inner wrapper is the key: fixed icon column */}
                      <span
                        className={`
                          h-full w-full grid items-center
                          ${isOpen ? "grid-cols-[40px_1fr]" : "grid-cols-1 justify-items-center"}
                        `}
                      >
                        {/* Icon cell (40px wide when open, centered when closed) */}
                        <span
                          className={`
                            h-10 w-10 rounded-xl grid place-items-center
                            ${active ? "bg-gray-800 text-white" : "text-gray-500"}
                          `}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        {/* Text cell */}
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

          {/* Footer */}
          <div className="px-3 py-3 border-t border-gray-100">
            {isOpen ? (
              <p className="text-[11px] text-gray-400">v1.0 • Workspace</p>
            ) : (
              <div className="h-2" />
            )}
          </div>
        </aside>

        {/* Content */}
        <main
          className={`
            flex-1 ml-16 transition-[margin-left] duration-200 ease-out
            ${isOpen ? "lg:ml-56" : "lg:ml-16"}
            w-full
          `}
        >
          <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
