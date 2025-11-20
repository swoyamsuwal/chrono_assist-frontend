"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function Header() {
  const pathname = usePathname(); 
  return (
    <header className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="text-xl font-bold">Logo</div>
        
        {/* Navigation Links */}
        <nav className="flex items-center gap-8">
          <a href="#api" className="hover:text-gray-300 transition">API</a>
          <a href="#help" className="hover:text-gray-300 transition">Help</a>
        </nav>
        
        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          {pathname !== "/login" && (
          <Link href="/login">
            <button className="px-6 py-2 border border-gray-400 rounded hover:bg-gray-700 transition">
              Login
            </button>
          </Link>
          )}
          {/* Hide Sign Up when current page is /create-account */}
          {pathname !== "/create-account" && (
            <Link href="/create-account">
              <button className="px-6 py-2 border border-gray-400 rounded hover:bg-gray-700 transition">
                Sign Up
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
