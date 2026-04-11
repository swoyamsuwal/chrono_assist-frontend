"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const [showPass, setShowPass] = useState(false);

  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getCSRFToken = () => {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("csrftoken"));
    return match ? match.split("=")[1] : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors(null);
    setLoading(true);

    try {
      await fetch("http://127.0.0.1:8000/authapp/csrf/", {
        method: "GET",
        credentials: "include",
      });
      const csrfToken = getCSRFToken();

      const response = await fetch("http://127.0.0.1:8000/authapp/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const data = await response.json();

      if (response.ok && data.otp_required) {
        setShowOtp(true);
      } else {
        setErrors({ general: data.error || "Invalid email or password" });
      }
    } catch (err) {
      console.error(err);
      setErrors({ general: "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors(null);

    try {
      const csrfToken = getCSRFToken();

      const response = await fetch("http://127.0.0.1:8000/authapp/verify-otp/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken || "",
        },
        credentials: "include",
        body: JSON.stringify({ email: formData.email, code: otp }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));

        try {
          const jwtRes = await fetch("http://127.0.0.1:8000/api/token/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: formData.email,
              password: formData.password,
            }),
          });

          const jwtData = await jwtRes.json();
          if (jwtRes.ok) {
            localStorage.setItem("accessToken", jwtData.access);
            localStorage.setItem("refreshToken", jwtData.refresh);
          } else {
            setErrors({ general: "JWT login failed" });
            setLoading(false);
            return;
          }
        } catch (err) {
          setErrors({ general: "Error getting JWT" });
          setLoading(false);
          return;
        }

        setShowOtp(false);
        setOtp("");
        setFormData({ email: "", password: "" });
        router.push("/dashboard");
      } else {
        setErrors({ general: data.error || "Invalid OTP" });
      }
    } catch (err) {
      console.error(err);
      setErrors({ general: "Something went wrong. Try again." });
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
          <div className="flex items-center gap-2.5">
            <Image 
              src="/vercel.png"
              alt="Vercel Logo"
              width={35}
              height={35}
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
            Welcome<br />
            <span className="text-indigo-400">back.</span>
          </h2>
          <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-xs">
            Sign in to your workspace and pick up right where you left off.
          </p>

          {/* Stats row */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { value: "10K+", label: "Users" },
              { value: "99.9%", label: "Uptime" },
              { value: "256bit", label: "Encrypted" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 px-3 py-4 text-center">
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Testimonial card */}
          <div className="mt-8 rounded-2xl bg-white/5 border border-white/10 p-5">
            <p className="text-slate-300 text-sm leading-relaxed">
              "Chrono cut our email drafting time in half. The AI tone picker is brilliant."
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-indigo-500 grid place-items-center text-white text-xs font-bold">
                RK
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Ram K.</div>
                <div className="text-xs text-slate-500">Product Manager</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs text-slate-500">
            © 2026 Chrono · All rights reserved.
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
                <path
                  d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                  stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-bold text-slate-900 text-sm">Chrono</span>
          </div>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">Don&apos;t have an account?</span>
            <Link href="/create-account">
              <button className="px-4 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 hover:bg-slate-50 transition">
                Sign up
              </button>
            </Link>
          </div>
        </div>

        {/* Form center */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Sign in to Chrono</h1>
              <p className="mt-2 text-sm text-slate-500">
                Enter your credentials — we&apos;ll send a one-time code to verify it&apos;s you.
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
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <a href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    name="password"
                    placeholder="Your password"
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
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm shadow-indigo-200"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending OTP…
                  </>
                ) : (
                  <>
                    Sign in
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">secured with OTP 2FA</span>
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
          </div>
        </div>
      </div>

      {/* ── OTP MODAL ── */}
      {showOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="h-14 w-14 rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center">
                <svg className="h-7 w-7 text-indigo-600" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1.5" fill="currentColor" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900 text-center">Check your email</h2>
            <p className="mt-2 text-sm text-slate-500 text-center">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-slate-700">{formData.email}</span>
            </p>

            {/* Error */}
            {errors?.general && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              {/* OTP input */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 transition"
                placeholder="••••••"
              />

              {/* Progress dots */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={[
                      "h-1.5 w-1.5 rounded-full transition-all duration-200",
                      i < otp.length ? "bg-indigo-600 w-3" : "bg-slate-200",
                    ].join(" ")}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition disabled:opacity-60 shadow-sm shadow-indigo-200"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Verifying…
                  </>
                ) : (
                  "Verify & Sign in"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOtp(false);
                  setOtp("");
                  setErrors(null);
                }}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-400">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                type="button"
                className="font-semibold text-indigo-600 hover:text-indigo-700 transition"
                onClick={() => handleSubmit({ preventDefault: () => {} })}
              >
                resend
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
