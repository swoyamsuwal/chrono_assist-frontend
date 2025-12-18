"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, MonitorUp, ChevronDown } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

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

  const handleLogout = async () => {
    try {
      await fetch("http://127.0.0.1:8000/authapp/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (e) {
      console.error("Logout error:", e);
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    setUser(null);
    setIsUserMenuOpen(false);
    router.push("/login");
  };

  const handleProfileClick = () => {
    setIsUserMenuOpen(false);
    router.push("/profile"); // or whatever route you want
  };

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

          {/* Desktop User Dropdown */}
          <div className="hidden md:block relative">
            <button
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-900 font-semibold rounded-md shadow-md hover:bg-white transition-colors duration-200"
            >
              <span>{user ? user.username : "You are"}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <button
                  onClick={handleProfileClick}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
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

      {/* Mobile menu unchanged... */}
    </header>
  );
}
