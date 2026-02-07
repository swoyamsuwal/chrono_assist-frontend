"use client";

import { usePathname, useRouter } from "next/navigation";
import Header from "./Header_second";

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Permission", href: "/permission" },
  { name: "File Upload", href: "/file-upload" },
  { name: "Prompt", href: "/prompt" },
  { name: "Mail", href: "/mail" },
  { name: "Calendar", href: "/calendar" },
];

export default function SideBarLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* HEADER */}
      <div className="fixed top-0 left-0 z-50 w-full bg-gray-900 border-b border-gray-700">
        <Header />
      </div>

      {/* MAIN UNDER HEADER */}
      <div className="pt-[80px] px-6 pb-8">
        <div className="max-w-7xl mx-auto flex gap-6">
          {/* SIDEBAR 3/12 */}
          <aside className="w-3/12">
            <nav className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-gray-400 mb-2 px-2">
                MENU
              </div>
              <ul className="space-y-1">
                {sidebarItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <button
                        onClick={() => router.push(item.href)}
                        className={
                          "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between " +
                          (active
                            ? "bg-indigo-600 text-white"
                            : "text-gray-200 hover:bg-gray-700 hover:text-white")
                        }
                      >
                        <span>{item.name}</span>
                        {active && (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* CONTENT 9/12 */}
          <main className="w-9/12">{children}</main>
        </div>
      </div>
    </div>
  );
}
