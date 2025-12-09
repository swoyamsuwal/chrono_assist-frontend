"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, MonitorUp } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null); // <- user state

  const navItems = [
    { name: "HOME", href: "/" },
    { name: "ABOUT", href: "/about" },
    { name: "HELP", href: "/help" },
    { name: "CONTACT US", href: "/contact" },
  ];

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

  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="bg-gray-700 p-2 rounded-lg shrink-0">
              <MonitorUp className="w-6 h-6 text-indigo-400" />
            </div>
            <Link
              href="/"
              className="text-xl font-extrabold text-white tracking-wider hidden sm:block"
            >
              Chrono Assist
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  text-sm font-medium uppercase tracking-wide transition-colors duration-200
                  ${
                    pathname === item.href
                      ? "text-indigo-400 border-b-2 border-indigo-400 pb-1"
                      : "text-gray-300 hover:text-white hover:border-b-2 hover:border-gray-500 pb-1"
                  }
                `}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Button */}
          <div className="hidden md:block">
            <button className="px-6 py-2 bg-gray-300 text-gray-900 font-semibold rounded-md shadow-md hover:bg-white transition-colors duration-200">
              {user ? user.username : "You ared"}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <div
        className={`md:hidden ${
          isMenuOpen ? "block" : "hidden"
        } absolute w-full bg-gray-900 border-t border-gray-800`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className={`
                block px-3 py-2 rounded-md text-base font-medium transition-colors
                ${
                  pathname === item.href
                    ? "bg-gray-700 text-indigo-400"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }
              `}
            >
              {item.name}
            </Link>
          ))}

          <button className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-900 font-semibold rounded-md text-base hover:bg-white transition-colors">
            {user ? user.username : "You are"}
          </button>
        </div>
      </div>
    </header>
  );
}
