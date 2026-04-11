"use client";

// ===============================================================
//  app/permission/create/page.jsx  (Create Sub-Account page)
//  Admin-only form to create a new user account under the org.
//
//  USER FLOW:
//    1. Fill username, email, role, password, confirm password
//    2. Client-side validation runs on submit (and email on blur)
//    3. POST /authapp/sub-register/ with JWT auth header
//    4. On success → show confirmation screen → redirect back
//
//  BACKEND ENDPOINTS:
//    GET  /rbac/roles/             → populate the Role <select>
//    POST /authapp/sub-register/   → create the account
//                                    body: { username, email, password, role_id }
//
//  VALIDATION LAYERS:
//    1. Password strength  — rejects "Weak" passwords before submit
//    2. Password match     — both fields must be identical
//    3. Email (on blur)    — structure regex + TLD allowlist + typo map
//    4. Role selected      — required field
//    5. Server errors      — field-level DRF errors mapped to state
// ===============================================================

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import SideBarLayout from "../../components/Side_bar";

// ================================================================
//  Utility: passwordStrength
//  Scores a password on four criteria and returns a visual descriptor.
//
//  Scoring:
//    +1  length >= 8 chars
//    +1  contains uppercase letter
//    +1  contains digit
//    +1  contains special character
//
//  Returns: { label, color, width } used to render the strength bar,
//           or null when the input is empty.
// ================================================================
function passwordStrength(pw) {
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8)          score++;  // length
  if (/[A-Z]/.test(pw))        score++;  // uppercase
  if (/[0-9]/.test(pw))        score++;  // digit
  if (/[^A-Za-z0-9]/.test(pw)) score++;  // special char
  if (score <= 1) return { label: "Weak",   color: "bg-red-400",    width: "w-1/4"  };
  if (score === 2) return { label: "Fair",   color: "bg-amber-400",  width: "w-2/4"  };
  if (score === 3) return { label: "Good",   color: "bg-blue-400",   width: "w-3/4"  };
  return               { label: "Strong", color: "bg-emerald-500", width: "w-full" };
}

// ================================================================
//  Utility: validateEmail
//  Three-layer validation — same logic as the main register page
//  so both pages enforce identical rules consistently.
//
//  Layer 1 — Structure regex  (local@domain.tld shape)
//  Layer 2 — TLD allowlist    (blocks ".cmo", ".vom", unknown TLDs)
//            ↑ "Restricted domain" check
//  Layer 3 — Domain typo map  (surfaces "Did you mean?" suggestions)
//            ↑ "Passthrough" correction hints
//
//  Returns: { valid: boolean, message: string | null }
//    valid=true  + message=null   → email is clean
//    valid=false + message=string → show the message as a hint
//    valid=false + message=null   → empty input, show nothing
// ================================================================
function validateEmail(email) {
  if (!email) return { valid: false, message: null };

  // ── Layer 1: Structure ──────────────────────────────────────────
  // Ensures the input follows the basic local@domain.tld shape.
  // Does not catch domain typos — those are handled in Layer 3.
  const structureRx = /^[^\s@]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!structureRx.test(email)) {
    return { valid: false, message: "Enter a valid email address (e.g. john@example.com)." };
  }

  // ── Layer 2: TLD Allowlist — Restricted Domain Check ───────────
  // Rejects any email whose TLD is not in the approved set.
  // This catches nonsense TLDs like ".cmo" or ".vom" that pass
  // the structure regex but are not real domain extensions.
  // Add country-code TLDs here as your user base grows.
  const [, domainFull] = email.split("@");
  const domain = domainFull.toLowerCase();
  const tld    = domain.split(".").at(-1);

  const VALID_TLDS = new Set([
    // Generic
    "com","net","org","edu","gov","mil",
    // Modern / tech
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

  // ── Layer 3: Domain Typo Map — Passthrough / Suggestions ───────
  // Detects common domain misspellings (e.g. "gmial.com") and
  // surfaces a corrected suggestion instead of a generic error.
  // These are "passthrough" hints — the user knows what they meant
  // and just needs to be pointed to the right spelling.
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
      message: `Looks like a typo — did you mean @${TYPO_MAP[domain]}?`,
    };
  }

  return { valid: true, message: null };
}

// ================================================================
//  Page component: CreateAccountPage
//
//  State overview:
//    formData          — { username, email, password } controlled inputs
//    confirmPassword   — separate state (not part of the API payload)
//    roles / roleId    — fetched role list + selected role id
//    rolesLoading      — true while GET /rbac/roles/ is in flight
//    loading           — true while POST /authapp/sub-register/ is in flight
//    success           — true after a successful create (shows success screen)
//    showPass          — toggles password field visibility
//    showConfirm       — toggles confirm-password field visibility
//    errors            — field-level error map: { username, email, password,
//                        confirmPassword, role, general }
//    emailValidation   — { valid, message } result of validateEmail(), updated
//                        on blur and cleared while the user is typing
// ================================================================
export default function CreateAccountPage() {
  // ── Form state ────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    username: "",
    email:    "",
    password: "",
  });
  // confirmPassword is kept separate because it is never sent to the API —
  // it exists only as a client-side match guard.
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Roles ─────────────────────────────────────────────────────────
  const [roles,        setRoles]        = useState([]);
  const [roleId,       setRoleId]       = useState("");
  const [rolesLoading, setRolesLoading] = useState(true);

  // ── UI state ──────────────────────────────────────────────────────
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Field-level errors ────────────────────────────────────────────
  // Keys: username | email | password | confirmPassword | role | general
  // Populated by both client-side validation and server-side DRF errors.
  const [errors, setErrors] = useState({});

  // ── Live email validation ─────────────────────────────────────────
  // Driven by blur events so the user is not interrupted while typing.
  // Cleared immediately on every keystroke inside the email input.
  const [emailValidation, setEmailValidation] = useState({ valid: false, message: null });

  const router   = useRouter();
  const API_BASE = "http://127.0.0.1:8000";

  // Derived strength object — recomputed whenever the password field changes
  const strength = passwordStrength(formData.password);

  // Reads JWT from localStorage — safe to call on every request
  function getAccessToken() {
    return typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;
  }

  // ── Fetch roles on mount ──────────────────────────────────────────
  // Populates the Role <select>. Silently swallows errors — if roles
  // fail to load the empty-state hint below the select guides the user.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    (async () => {
      try {
        setRolesLoading(true);
        const res = await fetch(`${API_BASE}/rbac/roles/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        // Handle both plain array and DRF paginated { results: [...] } shape
        setRoles(Array.isArray(data) ? data : data?.results || []);
      } catch {
        // ignore — empty state hint is shown below the select
      } finally {
        setRolesLoading(false);
      }
    })();
  }, []);

  // ================================================================
  //  Handler: handleChange
  //  Generic onChange for the three formData fields.
  //
  //  Side effects:
  //    • Clears the field's existing error so stale red text disappears
  //      the moment the user starts correcting the input.
  //    • Resets emailValidation when the email field changes so the
  //      ✅/❌ icon disappears while the user is actively typing.
  // ================================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear stale field error as the user edits
    setErrors((prev) => ({ ...prev, [name]: undefined }));

    // Reset email validation state while the user is retyping their email
    if (name === "email") {
      setEmailValidation({ valid: false, message: null });
    }
  };

  // ================================================================
  //  Handler: handleEmailBlur
  //  Fires when the email input loses focus.
  //  Runs all three validation layers and stores the result so the
  //  ✅/❌ icon and hint text are rendered immediately after tabbing away.
  //  Not called on every keystroke to avoid distracting mid-typing errors.
  // ================================================================
  const handleEmailBlur = () => {
    if (formData.email) {
      setEmailValidation(validateEmail(formData.email));
    }
  };

  // ================================================================
  //  Handler: handleSubmit
  //  Runs client-side validation in this order before hitting the API:
  //
  //  1. Password strength  — blocks "Weak" passwords
  //  2. Password match     — both fields must be identical
  //  3. Email validity     — re-runs validateEmail() to catch cases
  //                          where blur never fired (autofill / fast submit)
  //  4. Role selected      — required field guard
  //  5. POST /authapp/sub-register/
  //
  //  On success:  sets success=true → shows confirmation screen
  //               → auto-redirects back after 2 s
  //  On API error: maps Django field-level errors to the errors state
  // ================================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // ── 1. Password strength ────────────────────────────────────────
    if (strength?.label === "Weak") {
      setErrors({ password: "Password is too weak. Add uppercase letters, numbers, or symbols." });
      return;
    }

    // ── 2. Password match ───────────────────────────────────────────
    if (formData.password !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords don't match!" });
      return;
    }

    // ── 3. Email validation (final check on submit) ─────────────────
    // Re-runs in case the user submitted without ever blurring the email field
    // (e.g. autofilled credentials and hit Enter immediately).
    const emailCheck = validateEmail(formData.email);
    if (!emailCheck.valid) {
      setEmailValidation(emailCheck);
      setErrors({ email: emailCheck.message });
      return;
    }

    // ── 4. Role selected ────────────────────────────────────────────
    if (!roleId) {
      setErrors({ role: "Please select a role." });
      return;
    }

    // ── 5. API call ─────────────────────────────────────────────────
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/authapp/sub-register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ ...formData, role_id: roleId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Django DRF returns field-level validation errors as a dict, e.g.:
        //   { "email": ["User with this email already exists."], "username": [...] }
        // We map each array's first item to the matching field error key.
        setErrors({
          email:    data.email?.[0]    || undefined,
          username: data.username?.[0] || undefined,
          // Only show a generic banner when no field-level errors were returned
          general:  data.error || (!data.email && !data.username
            ? "Failed to create account."
            : undefined),
        });
        return;
      }

      // ── Success ──────────────────────────────────────────────────
      setSuccess(true);
      setTimeout(() => router.back(), 2000); // auto-redirect after 2 s
    } catch {
      // Catches network errors (offline, CORS, DNS failure, etc.)
      setErrors({ general: "Network error. Please check your connection." });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => router.back();

  // ── Success Screen ────────────────────────────────────────────────
  // Replaces the entire form after a successful create.
  // The user can also manually click "Back to Permissions" without
  // waiting for the 2-second auto-redirect.
  if (success) {
    return (
      <SideBarLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-10 max-w-md w-full text-center">
            {/* Animated checkmark circle */}
            <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-emerald-50 ring-4 ring-emerald-100 grid place-items-center">
              <svg className="h-8 w-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Account Created!</h2>
            <p className="text-sm text-slate-500 mb-8">
              Sub-account created successfully. Redirecting back…
            </p>
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              Back to Permissions
            </button>
          </div>
        </div>
      </SideBarLayout>
    );
  }

  // ── Main Form ─────────────────────────────────────────────────────
  return (
    <SideBarLayout>
      <div className="w-full">

        {/* ── Page header: back button + title ── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition grid place-items-center"
            title="Go back"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Create Sub-Account</h1>
            <p className="mt-1 text-sm text-slate-500">Add a new user account under your organization</p>
          </div>
        </div>

        {/* Global error banner — shown for network errors and unhandled API errors */}
        {errors?.general && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2 text-sm text-red-700">
            <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {errors.general}
          </div>
        )}

        {/* ── Form card ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6 md:p-8">

          {/* Card heading: icon + section title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center text-indigo-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M15 19c0-1.657-2.239-3-5-3s-5 1.343-5 3v1h10v-1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">Account Details</div>
              <div className="text-sm text-slate-500">Fill in the information below to create a new user</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="w-1/2 m-auto space-y-5">

            {/* ── Username ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 disabled:opacity-50 transition"
              />
              {/* Server-side username error (e.g. "Username already taken") */}
              {errors?.username && (
                <p className="mt-1.5 text-xs text-red-600">{errors.username}</p>
              )}
            </div>

            {/* ── Email — with live blur-driven validation ── */}
            {/*
              Three visual states driven by emailValidation:
                1. Untouched / typing  → no ring, no icon, no hint text
                2. Blurred, invalid    → red ring + ❌ icon + hint message
                3. Blurred, valid      → emerald ring + ✅ icon + "Email looks good"
            */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <div className={`relative rounded-xl transition ${
                formData.email && emailValidation.message !== null
                  ? emailValidation.valid
                    ? "ring-2 ring-emerald-300"  // valid → green ring
                    : "ring-2 ring-red-300"       // invalid → red ring
                  : ""
              }`}>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleEmailBlur}  // validation fires on blur, not on every keystroke
                  placeholder="user@example.com"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 disabled:opacity-50 transition"
                />
                {/* Inline ✅ / ❌ icon — only visible after the first blur */}
                {formData.email && emailValidation.message !== null && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base select-none pointer-events-none">
                    {emailValidation.valid ? "✅" : "❌"}
                  </span>
                )}
              </div>

              {/* Hint for invalid email (TLD not recognised / domain typo) */}
              {formData.email && !emailValidation.valid && emailValidation.message && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {emailValidation.message}
                </p>
              )}

              {/* Green confirmation shown when email passes all three layers */}
              {formData.email && emailValidation.valid && (
                <p className="mt-1.5 text-xs text-emerald-600 font-medium">✓ Email looks good</p>
              )}

              {/* Server-side email error — only shown when no client hint is already visible
                  (avoids duplicate messages for the same field)                              */}
              {errors?.email && !emailValidation.message && (
                <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* ── Role select ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
              <select
                value={roleId}
                onChange={(e) => {
                  setRoleId(e.target.value);
                  setErrors((prev) => ({ ...prev, role: undefined })); // clear stale error
                }}
                required
                disabled={loading || rolesLoading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 disabled:opacity-50 transition"
              >
                <option value="" disabled>
                  {rolesLoading ? "Loading roles…" : "Select a role"}
                </option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {/* Client-side "role required" error */}
              {errors?.role && (
                <p className="mt-1.5 text-xs text-red-600">{errors.role}</p>
              )}
              {/* Empty state — guides the admin to create a role first */}
              {!rolesLoading && roles.length === 0 && (
                <p className="mt-1.5 text-xs text-slate-500">
                  No roles found.{" "}
                  <a href="/permission/roles/create" className="text-indigo-600 hover:underline">
                    Create a role first.
                  </a>
                </p>
              )}
            </div>

            {/* Visual divider between account info and password section */}
            <div className="border-t border-slate-100 pt-1" />

            {/* ── Password ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter strong password"
                  required
                  minLength={8}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 disabled:opacity-50 transition"
                />
                {/* Eye toggle — tabIndex=-1 keeps it out of the keyboard tab order */}
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  tabIndex={-1}
                >
                  {showPass ? (
                    // Eye-off icon (password visible)
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    // Eye icon (password hidden)
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Strength bar — only rendered when the password field is non-empty */}
              {formData.password && strength && (
                <div className="mt-2">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    {/* Bar width + colour transitions as the score increases */}
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Password strength:{" "}
                    <span className="font-medium text-slate-700">{strength.label}</span>
                  </p>
                </div>
              )}

              {/* Client-side "too weak" error set in handleSubmit step 1 */}
              {errors?.password && (
                <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* ── Confirm Password ── */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="Re-enter password"
                  required
                  minLength={8}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 disabled:opacity-50 transition"
                />
                {/* Eye toggle — same pattern as the password field above */}
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

              {/* Live match indicator — rendered as soon as the user starts typing */}
              {confirmPassword && (
                <p className={`mt-1.5 text-xs font-medium ${
                  formData.password === confirmPassword ? "text-emerald-600" : "text-red-500"
                }`}>
                  {formData.password === confirmPassword
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </p>
              )}

              {/* Client-side "passwords don't match" error from handleSubmit step 2.
                  Only shown when the confirmPassword field is empty (i.e. user
                  submitted without ever typing in this field).                     */}
              {errors?.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* ── Form actions: Cancel + Create Sub-Account ── */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
              {/* Cancel — goes back without submitting */}
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                Cancel
              </button>

              {/* Submit — shows spinner while loading */}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Creating…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                      <path d="M15 19c0-1.657-2.239-3-5-3s-5 1.343-5 3v1h10v-1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19 8v6M16 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Create Sub-Account
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SideBarLayout>
  );
}