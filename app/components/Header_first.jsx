// ===============================================================
//  components/Header.jsx
//  Public-facing landing page header
//  Used ONLY on the marketing/landing pages (not inside the app)
//
//  STRUCTURE:
//  ┌─────────────────────────────────────────────────────────┐
//  │  Logo (left)  │  Nav links (center)  │  Auth buttons   │
//  └─────────────────────────────────────────────────────────┘
//
//  SMART BUTTON HIDING:
//  usePathname() detects the current route so the header
//  hides the "Sign in" button on /login and the "Get started"
//  button on /create-account — avoids showing a link to the
//  page the user is already on
// ===============================================================


// ---------------- Step 0: Imports ----------------
"use client"; // Next.js App Router — usePathname() requires a client component

import Link     from "next/link";
import Image    from "next/image";
import { usePathname } from "next/navigation";


// ================================================================
//  Component: Header
//  Sticky top navigation bar for the public landing page
// ================================================================
export default function Header() {

  // ---------------- Step 1: Detect Current Route ----------------
  // Used to conditionally hide auth buttons on the page they navigate to
  const pathname = usePathname();

  return (
    // ---------------- Step 2: Sticky Header Shell ----------------
    // sticky top-0 z-50 → stays at the top when the user scrolls
    // backdrop-blur-sm bg-white/90 → frosted glass effect (solid white fallback)
    <header className="bg-white border-b border-slate-100 sticky top-0 z-50 backdrop-blur-sm bg-white/90">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* ── Step 3: Logo + Brand Name ──
            Wrapped in a Link so clicking the logo always returns to /
            next/image is used for optimized delivery (automatic WebP, lazy load) */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 flex items-center justify-center">
            <Image
              src="/vercel.png"
              alt="Vercel Logo"
              width={35}
              height={35}
              className="object-contain"
            />
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">
            Chrono
          </span>
        </Link>

        {/* ── Step 4: Navigation Links ──
            Rendered from an array for easy addition of new nav items
            Hash links (#features etc.) scroll to sections on the landing page
            hidden md:flex → collapses on mobile (no hamburger menu here) */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: "Features", href: "#features" },
            { label: "Donation", href: "#donation" },
            { label: "Help",     href: "#help"     },
          ].map((item) => (
            // <a> (not <Link>) because these are in-page anchor links, not route changes
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* ── Step 5: Auth Buttons ──
            Smart conditional rendering based on current route:
            - "Sign in" hidden on /login        (user is already there)
            - "Get started" hidden on /create-account (user is already there)
            This prevents confusing duplicate navigation               */}
        <div className="flex items-center gap-3">

          {/* Sign In — ghost style, only shown when NOT on /login */}
          {pathname !== "/login" && (
            <Link href="/login">
              <button className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition">
                Sign in
              </button>
            </Link>
          )}

          {/* Get Started — filled indigo CTA, only shown when NOT on /create-account */}
          {pathname !== "/create-account" && (
            <Link href="/create-account">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-200">
                Get started
                {/* Inline arrow SVG — avoids importing an icon library for one icon */}
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </button>
            </Link>
          )}

        </div>
      </div>
    </header>
  );
}