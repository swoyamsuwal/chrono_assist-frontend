"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const followUserId = searchParams.get("follow_user_id");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Password strength
  function passwordStrength(pw) {
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: "Weak", color: "bg-red-400", width: "w-1/4" };
    if (score === 2) return { label: "Fair", color: "bg-amber-400", width: "w-2/4" };
    if (score === 3) return { label: "Good", color: "bg-blue-400", width: "w-3/4" };
    return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
  }

  const strength = passwordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors(null);

    if (strength?.label === "Weak") {
    setErrors({ password: "Password is too weak. Add uppercase letters, numbers, or symbols." });
    return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords don't match!" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/authapp/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: formData.name,
          email: formData.email,
          password: formData.password,
          user_type: "main",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Account created successfully!");
        router.push("/login");
        setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      } else {
        setErrors(data);
      }
    } catch (err) {
      console.error(err);
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT BRAND PANEL ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 relative flex-col justify-between p-12 overflow-hidden bg-slate-900">
        {/* Gradient blobs */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
        <div className="flex items-center gap-3">
          <Image 
            src="/vercel.svg"
            alt="Vercel Logo"
            width={36}
            height={36}
            className="object-contain"
          />

          <span className="text-white font-bold text-lg tracking-tight">
            Chrono
          </span>
        </div>
      </div>

        {/* Center text */}
        <div className="relative z-10">
          <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Work smarter,<br />
            <span className="text-indigo-400">not harder.</span>
          </h2>
          <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-xs">
            Your AI-powered workspace — emails, tasks, and documents in one place.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {[
              { text: "AI email assistant with tone control" },
              { text: "Kanban task board with team roles" },
              { text: "Document Q&A with RAG chat" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 grid place-items-center text-base">
                  {f.icon}
                </div>
                <span className="text-slate-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10">
          <p className="text-xs text-slate-500">
            "The best investment you can make is in your own productivity."
          </p>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Top nav */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 grid place-items-center">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-sm">Chrono</span>
          </div>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">Already have an account?</span>
            <Link href="/login">
              <button className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 hover:bg-slate-50 transition">
                Sign in
              </button>
            </Link>
          </div>
        </div>

        {/* Form center */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Create your account</h1>
              <p className="mt-2 text-sm text-slate-500">
                Free forever. No credit card required.
              </p>
            </div>

            {/* General error */}
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
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Username
                </label>
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

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                />
                {errors?.email && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    name="password"
                    placeholder="Min. 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                    tabIndex={-1}
                  >
                    {showPass ? (
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
                {/* Strength bar */}
                {formData.password && strength && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Password strength: <span className="font-medium text-slate-700">{strength.label}</span>
                    </p>
                  </div>
                )}
                {errors?.password && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm password
                </label>
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
                {/* Match indicator */}
                {formData.confirmPassword && (
                  <p className={`mt-1.5 text-xs font-medium ${formData.password === formData.confirmPassword ? "text-emerald-600" : "text-red-500"}`}>
                    {formData.password === formData.confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
                {errors?.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit */}
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

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-100" />
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6">
              {[
                { text: "SSL Secured" },
                { text: "GDPR Safe" },
                { text: "99.9% Uptime" },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>

            {/* ToS */}
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
