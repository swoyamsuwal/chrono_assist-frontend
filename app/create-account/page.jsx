// ===============================================================
//  app/create-account/page.jsx  (RegisterPage)
//  New user registration form with client-side validation
//
//  FLOW:
//  1. User fills in username, email, password, confirm password
//  2. Client validates: email (TLD + typo), password strength + match
//  3. POST /authapp/register/ → Django creates the user
//  4. On success → custom SuccessModal → auto-redirect to /login
// ===============================================================


// ---------------- Step 0: Imports ----------------
"use client"; // Next.js App Router — all hooks require a client component

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";


// ================================================================
//  Component: SuccessModal
//  Custom animated success popup — replaces the browser's default alert()
//
//  BEHAVIOUR:
//  - Fades in on mount via CSS animation (fade-in + slide-up)
//  - Animated SVG checkmark draws itself on appear
//  - Auto-redirects to /login after 3 seconds via useEffect countdown
//  - "Go to Sign In" button lets the user redirect immediately
//  - Countdown ring visually shows the 3-second auto-redirect timer
//
//  TWO SEPARATE useEffect calls (not one) — avoids React render error:
//  - Effect 1: Only ticks the countdown (never touches parent state)
//  - Effect 2: Watches count — when 0, calls onContinue() safely
//              after the render is committed, not during
//
//  PROPS:
//  onContinue → called when the user clicks "Go to Sign In"
//               OR when the 3-second countdown reaches 0
// ================================================================
function SuccessModal({ onContinue }) {

  // countdown — ticks down from 3 to 0
  const [count, setCount] = useState(3);

  // ── Effect 1: Countdown ticker ──
  // Only decrements count every second
  // Re-runs when count changes; stops when count hits 0 (early return guard)
  useEffect(() => {
    if (count === 0) return; // Already done — don't start another interval
    const id = setInterval(() => {
      setCount((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id); // Cleanup on unmount or when count changes
  }, [count]);

  // ── Effect 2: Redirect trigger ──
  // Fires onContinue() only after React has committed the count=0 render
  // This is the safe place to trigger parent state updates (setShowSuccess)
  useEffect(() => {
    if (count === 0) onContinue();
  }, [count, onContinue]);

  // Circumference of the SVG countdown ring (r=20 → C = 2π×20 ≈ 125.66)
  const CIRCUMFERENCE = 2 * Math.PI * 20;
  // dashOffset shrinks each second — visually drains the ring as time passes
  const dashOffset = CIRCUMFERENCE * (count / 3);

  return (
    // ── Backdrop ──
    // fixed inset-0 → covers the entire viewport above the form
    // backdrop-blur-sm → frosted glass effect behind the modal card
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm"
      style={{ animation: "pf-fade-in 0.2s ease both" }}
    >

      {/* ── Modal Card ── */}
      <div
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-8 text-center"
        style={{ animation: "pf-slide-up 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
      >

        {/* ── Animated Checkmark Circle ──
            Outer SVG: countdown ring that drains over 3 seconds
            Inner div: emerald circle with a self-drawing checkmark path  */}
        <div className="flex justify-center mb-6">
          <div className="relative h-20 w-20">

            {/* Countdown ring SVG
                -rotate-90 → starts the ring at 12 o'clock (top) instead of 3 o'clock */}
            <svg className="absolute inset-0 h-20 w-20 -rotate-90" viewBox="0 0 48 48">
              {/* Background track ring — static slate color */}
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              {/* Animated foreground ring — drains as countdown ticks
                  strokeDashoffset transitions linearly over 1s to match the interval */}
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>

            {/* Green filled circle with animated checkmark
                pf-pop-in → scale 0.5→1.1→1 spring overshoot on mount */}
            <div
              className="absolute inset-2 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center"
              style={{ animation: "pf-pop-in 0.4s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}
            >
              <svg className="h-8 w-8 text-emerald-500" viewBox="0 0 24 24" fill="none">
                {/* Checkmark path — stroke-dashoffset 30→0 draws itself on appear */}
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 30,
                    strokeDashoffset: 0,
                    animation: "pf-draw-check 0.4s ease 0.3s both",
                  }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Heading — staggered fade in after the checkmark ── */}
        <h2
          className="text-xl font-bold text-slate-900"
          style={{ animation: "pf-fade-in 0.3s ease 0.3s both" }}
        >
          Account Created!
        </h2>

        {/* ── Sub-text with live countdown number ── */}
        <p
          className="mt-2 text-sm text-slate-500 leading-relaxed"
          style={{ animation: "pf-fade-in 0.3s ease 0.4s both" }}
        >
          Your account has been successfully created.<br />
          Redirecting to sign in in{" "}
          {/* count updates every second — indigo accent draws the eye */}
          <span className="font-semibold text-indigo-600">{count}s</span>…
        </p>

        <div
          className="my-5 h-px bg-slate-100"
          style={{ animation: "pf-fade-in 0.3s ease 0.5s both" }}
        />

        {/* ── Go to Sign In button — skips the countdown immediately ── */}
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition shadow-sm shadow-indigo-200"
          style={{ animation: "pf-fade-in 0.3s ease 0.55s both" }}
        >
          Go to Sign In
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* ── Keyframe Styles ──
            Injected inline so no global CSS file changes are needed
            pf- prefix (page-fragment) avoids collisions with other animations

            pf-fade-in    → opacity 0 → 1
            pf-slide-up   → opacity 0→1 + translateY 16px → 0
            pf-pop-in     → scale 0.5 → 1.1 → 1 (spring overshoot feel)
            pf-draw-check → strokeDashoffset 30 → 0 (draws the checkmark) */}
        <style>{`
          @keyframes pf-fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes pf-slide-up {
            from { opacity: 0; transform: translateY(16px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0)    scale(1);    }
          }
          @keyframes pf-pop-in {
            0%   { transform: scale(0.5); opacity: 0; }
            70%  { transform: scale(1.1);              }
            100% { transform: scale(1);   opacity: 1; }
          }
          @keyframes pf-draw-check {
            from { stroke-dashoffset: 30; }
            to   { stroke-dashoffset: 0;  }
          }
        `}</style>
      </div>
    </div>
  );
}


// ================================================================
//  Utility: validateEmail
//  Three-layer client-side email validation:
//
//  Layer 1 — Structure check (regex)
//    Ensures the email has the shape: local@domain.tld
//    Rejects: missing @, spaces, no dot in domain
//
//  Layer 2 — TLD allowlist check
//    Rejects uncommon or misspelled TLDs (e.g. ".cmo", ".vom")
//    Covers all major country + generic TLDs used in Nepal and globally
//
//  Layer 3 — Common domain typo map
//    Catches the most frequent email typos (e.g. "gmial.com" → "gmail.com")
//    Returns a "Did you mean?" suggestion instead of a generic error
//
//  Returns: { valid: boolean, message: string | null }
//    valid: true   → email passed all three layers
//    valid: false  → message contains a human-readable hint
// ================================================================
function validateEmail(email) {
  if (!email) return { valid: false, message: null }; // Empty → no error shown yet

  // ---------------- Layer 1: Structure ----------------
  // Allows: letters, numbers, dots, hyphens, underscores in local part
  // Requires: @, a domain with at least one dot, TLD of 2-6 chars
  const structureRx = /^[^\s@]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!structureRx.test(email)) {
    return { valid: false, message: "Enter a valid email address (e.g. john@example.com)." };
  }

  // ---------------- Layer 2: TLD Allowlist ----------------
  // Extract domain and TLD from the email string
  const [, domainFull] = email.split("@");
  const domain = domainFull.toLowerCase();
  const tld    = domain.split(".").at(-1); // Last segment after the final dot

  const VALID_TLDS = new Set([
    // Generic TLDs
    "com","net","org","edu","gov","mil",
    // Modern / tech TLDs
    "io","co","app","dev","ai","me","info","biz","tech","online","site",
    // Country-code TLDs (major markets + Nepal)
    "uk","us","ca","au","nz","in","np","de","fr","jp","br","mx","nl",
    "se","no","dk","fi","pl","ru","cn","sg","hk","za","ke","ng",
  ]);

  if (!VALID_TLDS.has(tld)) {
    return {
      valid:   false,
      message: `".${tld}" isn't a recognised domain extension. Did you mean .com?`,
    };
  }

  // ---------------- Layer 3: Domain Typo Map ----------------
  // Keys are misspelled domains; values are the correct version
  // Covers the most common mobile/fast-typing mistakes
  const TYPO_MAP = {
    "gamilc.om":     "gmail.com",
    "gmail.co":      "gmail.com",
    "gmail.cm":      "gmail.com",
    "gmail.cmo":     "gmail.com",
    "gmial.com":     "gmail.com",
    "gmai.com":      "gmail.com",
    "gnail.com":     "gmail.com",
    "gamil.com":     "gmail.com",
    "yahoo.co":      "yahoo.com",
    "yaho.com":      "yahoo.com",
    "yahooo.com":    "yahoo.com",
    "hotmail.co":    "hotmail.com",
    "hotmail.cm":    "hotmail.com",
    "hotmial.com":   "hotmail.com",
    "outlook.co":    "outlook.com",
    "outlok.com":    "outlook.com",
    "icloud.co":     "icloud.com",
    "protonmail.co": "protonmail.com",
  };

  if (TYPO_MAP[domain]) {
    return {
      valid:   false,
      // Surfaces the correct spelling directly in the error message
      message: `Looks like a typo — did you mean @${TYPO_MAP[domain]}?`,
    };
  }

  // Passed all three layers
  return { valid: true, message: null };
}


// ================================================================
//  Component: RegisterPage
//  Handles new account creation with live password + email validation
// ================================================================
export default function RegisterPage() {

  // ---------------- Step 1: Router + Query Params ----------------
  const router       = useRouter();
  const searchParams = useSearchParams();
  // followUserId → present when user arrives via an invite link
  // e.g. /create-account?follow_user_id=42
  // Currently read but reserved for future invite flow logic
  const followUserId = searchParams.get("follow_user_id");


  // ---------------- Step 2: Form State ----------------
  const [formData, setFormData] = useState({
    name:            "",
    email:           "",
    password:        "",
    confirmPassword: "",
  });
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState(null);   // Field-level or { general: "..." }
  const [showPass,    setShowPass]    = useState(false);  // Toggle password field visibility
  const [showConfirm, setShowConfirm] = useState(false);  // Toggle confirm field visibility
  const [showSuccess, setShowSuccess] = useState(false);  // Controls SuccessModal overlay

  // ---------------- Step 3: Live Email Validation State ----------------
  // Separate from errors{} so it can be updated on blur independently
  // without wiping other field errors that are already showing
  const [emailValidation, setEmailValidation] = useState({ valid: false, message: null });


  // ================================================================
  //  Handler: handleChange
  //  Generic onChange for all form inputs
  //  Uses the input's name attribute to update the correct formData key
  //  Special case: clears stale emailValidation when the email field changes
  //  so the ✅/❌ icon and hint text disappear while the user re-types
  // ================================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear the live email hint while the user is actively editing
    // It will re-run on blur (handleEmailBlur) once they tab/click away
    if (name === "email") {
      setEmailValidation({ valid: false, message: null });
    }
  };


  // ================================================================
  //  Handler: handleEmailBlur
  //  Fires when the email input loses focus (onBlur)
  //  Runs validateEmail() and stores the result in emailValidation
  //  so the ✅/❌ icon and hint appear immediately after the user
  //  tabs away — no need to wait for form submit
  // ================================================================
  const handleEmailBlur = () => {
    if (formData.email) {
      setEmailValidation(validateEmail(formData.email));
    }
  };


  // ================================================================
  //  Utility: passwordStrength
  //  Scores a password on 4 criteria and returns a UI descriptor
  //
  //  Scoring:
  //   +1 if length >= 8
  //   +1 if contains uppercase letter
  //   +1 if contains a digit
  //   +1 if contains a special character
  //
  //  Returns: { label, color, width } for the animated strength bar
  //   0-1 → Weak   (red,   w-1/4)
  //   2   → Fair   (amber, w-2/4)
  //   3   → Good   (blue,  w-3/4)
  //   4   → Strong (green, w-full)
  // ================================================================
  function passwordStrength(pw) {
    if (!pw) return null; // No password yet → don't show the bar
    let score = 0;
    if (pw.length >= 8)          score++; // Length check
    if (/[A-Z]/.test(pw))        score++; // Uppercase check
    if (/[0-9]/.test(pw))        score++; // Digit check
    if (/[^A-Za-z0-9]/.test(pw)) score++; // Special character check

    if (score <= 1) return { label: "Weak",   color: "bg-red-400",    width: "w-1/4"  };
    if (score === 2) return { label: "Fair",   color: "bg-amber-400",  width: "w-2/4"  };
    if (score === 3) return { label: "Good",   color: "bg-blue-400",   width: "w-3/4"  };
    return               { label: "Strong", color: "bg-emerald-500", width: "w-full" };
  }

  // Derived — recomputed on every render as the password field changes
  const strength = passwordStrength(formData.password);


  // ================================================================
  //  Handler: handleSubmit
  //  Order of validation (client-side first, API last):
  //  1. Password strength — blocks "Weak" passwords before any API call
  //  2. Password match    — both fields must be identical
  //  3. Email validity    — runs validateEmail() one final time on submit
  //     in case the user never blurred the field (e.g. autofill + submit)
  //  4. POST /authapp/register/ — only reached if all three pass
  // ================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors(null);

    // ---------------- Validation 1: Password Strength ----------------
    if (strength?.label === "Weak") {
      setErrors({ password: "Password is too weak. Add uppercase letters, numbers, or symbols." });
      return;
    }

    // ---------------- Validation 2: Password Match ----------------
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords don't match!" });
      return;
    }

    // ---------------- Validation 3: Email ----------------
    // Re-runs validation on submit in case the blur event was never fired
    // (e.g. autofill → click submit without tabbing through the field)
    const emailCheck = validateEmail(formData.email);
    if (!emailCheck.valid) {
      setEmailValidation(emailCheck);        // Shows the ❌ icon + hint under the field
      setErrors({ email: emailCheck.message }); // Also sets errors for the submit guard
      return;
    }

    // ---------------- POST to Django Register Endpoint ----------------
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/authapp/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username:  formData.name,
          email:     formData.email,
          password:  formData.password,
          user_type: "main", // Distinguishes regular users from sub-accounts or invited users
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset form immediately so sensitive data doesn't linger in state
        setFormData({ name: "", email: "", password: "", confirmPassword: "" });
        // Show custom SuccessModal — it handles the countdown + redirect to /login
        setShowSuccess(true);
      } else {
        // Django's RegisterSerializer returns field-level errors as a dict
        // e.g. { email: ["This email is already in use."], username: [...] }
        setErrors(data);
      }
    } catch (err) {
      console.error(err);
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };


  // ================================================================
  //  Handler: handleSuccessContinue
  //  Called by SuccessModal when:
  //   (a) the user clicks "Go to Sign In", OR
  //   (b) Effect 2 fires after the 3-second countdown hits 0
  //  Hides the modal then navigates to /login
  // ================================================================
  const handleSuccessContinue = () => {
    setShowSuccess(false);
    router.push("/login");
  };


  // ── Step 4: Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">

      {/* ================================================================
          SUCCESS MODAL OVERLAY
          Rendered above everything when showSuccess === true
          SuccessModal owns its own countdown state + calls handleSuccessContinue
          ================================================================ */}
      {showSuccess && <SuccessModal onContinue={handleSuccessContinue} />}


      {/* ================================================================
          LEFT BRAND PANEL
          Decorative marketing panel — hidden on mobile (hidden lg:flex)
          Three z-index layers:
           0 (back)  → gradient blobs (indigo + violet)
           1 (mid)   → dot grid texture (CSS radial-gradient at 7% opacity)
           2 (front) → logo, headline, feature list, quote
          ================================================================ */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 relative flex-col justify-between p-12 overflow-hidden bg-slate-900">

        {/* Gradient blobs — purely decorative depth/atmosphere */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />

        {/* Dot grid texture — CSS radial-gradient repeat pattern at low opacity */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* ── Logo ── */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Image src="/vercel.svg" alt="Vercel Logo" width={36} height={36} className="object-contain" />
            <span className="text-white font-bold text-lg tracking-tight">Chrono</span>
          </div>
        </div>

        {/* ── Center Content: Headline + Feature List ── */}
        <div className="relative z-10">
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Work smarter,<br />
            <span className="text-indigo-400">not harder.</span>
          </h2>
          <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-xs">
            Your AI-powered workspace - emails, tasks, and documents in one place.
          </p>

          {/* Feature list — rendered from array for easy addition of new items */}
          <div className="mt-10 space-y-4">
            {[
              { text: "AI email assistant with tone control" },
              { text: "Kanban task board with team roles"    },
              { text: "Document Q&A with RAG chat"          },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                {/* Checkmark bullet — indigo tinted circle matching the brand */}
                <div className="h-5 w-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="h-3 w-3 text-indigo-400" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-slate-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom Quote ── */}
        <div className="relative z-10">
          <p className="text-xs text-slate-500">
            "The best investment you can make is in your own productivity."
          </p>
        </div>
      </div>


      {/* ================================================================
          RIGHT FORM PANEL
          Full-height white panel with the registration form
          Flexbox column: top nav bar → centered form area
          ================================================================ */}
      <div className="flex-1 flex flex-col bg-white">

        {/* ── Top Nav Bar ──
            Mobile logo (hidden on lg where the brand panel is visible)
            + "Already have an account? Sign in" prompt                  */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">

          {/* Mobile-only logo — hidden on lg+ */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 grid place-items-center">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-sm">Chrono</span>
          </div>
          <div className="hidden lg:block" /> {/* Spacer pushes sign-in link to the right on desktop */}

          {/* Already have account prompt */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">Already have an account?</span>
            <Link href="/login">
              <button className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 hover:bg-slate-50 transition">
                Sign in
              </button>
            </Link>
          </div>
        </div>

        {/* ── Centered Form Area ── */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">

            {/* ── Heading ── */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
              <p className="mt-2 text-sm text-slate-500">Free forever. No credit card required.</p>
            </div>

            {/* ── General Error Banner ──
                Only shown for network/unexpected errors
                Field-level errors render inline below each input         */}
            {errors?.general && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ── Username Field ──
                  Stored as "username" in Django's User model
                  errors.username → rendered from Django's serializer (e.g. "already taken") */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
                <input
                  type="text"
                  name="name"
                  placeholder="johndoe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                />
                {errors?.username && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.username}</p>
                )}
              </div>

              {/* ── Email Field ──
                  Three visual states driven by emailValidation:
                  1. Untouched / typing  → no ring, no icon, no hint
                  2. Blurred, invalid    → red ring + ❌ icon + hint message
                  3. Blurred, valid      → emerald ring + ✅ icon + "Email looks good"

                  onBlur triggers validateEmail() via handleEmailBlur
                  onChange clears stale validation via handleChange          */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email address</label>

                {/* Wrapper div applies the colored focus ring based on validation state */}
                <div className={`relative rounded-xl transition ${
                  formData.email && emailValidation.message !== null
                    ? emailValidation.valid
                      ? "ring-2 ring-emerald-300"  // Valid → green ring
                      : "ring-2 ring-red-300"       // Invalid → red ring
                    : ""                            // Untouched → no ring
                }`}>
                  <input
                    type="email"
                    name="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleEmailBlur}  // Triggers validation when user leaves the field
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                  />

                  {/* Inline valid/invalid icon — only shown after blur
                      pointer-events-none → doesn't interfere with input clicks */}
                  {formData.email && emailValidation.message !== null && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base select-none pointer-events-none">
                      {emailValidation.valid ? "✅" : "❌"}
                    </span>
                  )}
                </div>

                {/* Error hint (typo suggestion or TLD error) — shown when invalid */}
                {formData.email && !emailValidation.valid && emailValidation.message && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {emailValidation.message}
                  </p>
                )}

                {/* Green confirmation — shown when all three validation layers pass */}
                {formData.email && emailValidation.valid && (
                  <p className="mt-1.5 text-xs text-emerald-600 font-medium">✓ Email looks good</p>
                )}

                {/* Server-side error (e.g. "already in use")
                    Only shown when there's no client-side hint already visible
                    Prevents two conflicting messages appearing at once           */}
                {errors?.email && !emailValidation.message && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              {/* ── Password Field + Strength Bar ──
                  Strength bar width and color animate as the score changes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <div className="relative">
                  {/* type switches between "password" and "text" based on showPass */}
                  <input
                    type={showPass ? "text" : "password"}
                    name="password"
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                  />
                  {/* Eye toggle — tabIndex={-1} so Tab key skips it */}
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                    tabIndex={-1}
                  >
                    {showPass ? (
                      // Eye-off icon — shown when password is visible (plain text)
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      // Eye icon — shown when password is hidden (dots)
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Strength bar — only shown once the user starts typing */}
                {formData.password && strength && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      {/* Width and color class both come from passwordStrength() */}
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Password strength:{" "}
                      <span className="font-medium text-slate-700">{strength.label}</span>
                    </p>
                  </div>
                )}
                {/* Client-side "too weak" error set in handleSubmit */}
                {errors?.password && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              {/* ── Confirm Password Field + Live Match Indicator ──
                  Green ✓ when both fields match, red ✗ when they don't
                  Shown as soon as confirmPassword is non-empty             */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                  />
                  {/* Separate show/hide toggle for the confirm field */}
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Live match indicator — instant feedback without waiting for submit */}
                {formData.confirmPassword && (
                  <p className={`mt-1.5 text-xs font-medium ${
                    formData.password === formData.confirmPassword
                      ? "text-emerald-600"
                      : "text-red-500"
                  }`}>
                    {formData.password === formData.confirmPassword
                      ? "✓ Passwords match"
                      : "✗ Passwords do not match"}
                  </p>
                )}
                {/* Client-side mismatch error from handleSubmit */}
                {errors?.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* ── Submit Button ──
                  disabled during loading to prevent duplicate submissions
                  Shows spinner + label while request is in flight          */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm shadow-indigo-200"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating account…
                  </>
                ) : (
                  "Create Account →"
                )}
              </button>
            </form>

            {/* ── Divider ── */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-100" />
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* ── Trust Badges ── */}
            <div className="flex items-center justify-center gap-6">
              {[
                { text: "SSL Secured"  },
                { text: "GDPR Safe"    },
                { text: "99.9% Uptime" },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>{b.text}</span>
                </div>
              ))}
            </div>

            {/* ── Terms of Service Notice ── */}
            <p className="mt-8 text-center text-xs text-slate-400">
              By creating an account you agree to our{" "}
              <a href="#" className="underline hover:text-slate-700 transition">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="underline hover:text-slate-700 transition">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}