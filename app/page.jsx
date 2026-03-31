import Header from "./components/Header_first";
import Link from "next/link";

export default function LandingPage() {

  const features = [
    {
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: "AI Email Assistant",
      desc: "Draft emails in seconds with tone control — professional, polite, or firm. Let Chrono handle the words.",
      badge: "Most loved",
      tone: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    },
    {
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
        </svg>
      ),
      title: "Kanban Task Board",
      desc: "Drag-and-drop boards with role-based access control. Keep your team aligned and moving fast.",
      badge: "Teams",
      tone: "bg-violet-50 text-violet-700 ring-violet-100",
    },
    {
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      title: "Document RAG Chat",
      desc: "Upload your PDFs and DOCX files. Ask questions, get instant answers powered by AI.",
      badge: "AI-powered",
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    {
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
          <path d="M12 3 20 7v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V7l8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ),
      title: "Role-Based Permissions",
      desc: "Admin, Manager, Member — full RBAC out of the box. Control exactly who sees what.",
      badge: "Security",
      tone: "bg-amber-50 text-amber-700 ring-amber-100",
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "Free",
      sub: "Forever free",
      desc: "Perfect for solo users getting started.",
      cta: "Get started",
      ctaStyle: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
      items: ["5 documents", "100 AI emails/mo", "1 workspace", "Community support"],
      highlight: false,
    },
    {
      name: "Pro",
      price: "$12",
      sub: "per month",
      desc: "For power users who need more AI capacity.",
      cta: "Start free trial",
      ctaStyle: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200",
      items: ["Unlimited documents", "Unlimited AI emails", "3 workspaces", "Priority support"],
      highlight: true,
    },
    {
      name: "Team",
      price: "$39",
      sub: "per month",
      desc: "Built for small teams with advanced roles.",
      cta: "Start free trial",
      ctaStyle: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
      items: ["Everything in Pro", "10 team members", "RBAC permissions", "Team analytics"],
      highlight: false,
    },
    {
      name: "Enterprise",
      price: "Custom",
      sub: "contact us",
      desc: "Custom contracts, SLA, and dedicated support.",
      cta: "Contact sales",
      ctaStyle: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
      items: ["Unlimited members", "SSO / SAML", "Dedicated instance", "24/7 SLA support"],
      highlight: false,
    },
  ];

  const logos = ["Vercel", "Stripe", "Linear", "Notion", "Figma"];

  return (
    <div className="bg-white">
      <Header />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-white">
        {/* Background blobs */}
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-indigo-50 blur-3xl -z-0 opacity-70" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-violet-50 blur-3xl -z-0 opacity-50" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left text */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 bg-indigo-50 text-indigo-700 ring-indigo-100 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Now with RAG Document Chat
              </span>

              <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] tracking-tight">
                Your AI-powered<br />
                <span className="text-indigo-600">work&shy;space.</span>
              </h1>

              <p className="mt-6 text-lg text-slate-500 leading-relaxed max-w-md">
                Emails, tasks, and documents — all in one place. Chrono uses AI to make your team 10× more productive.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/create-account">
                  <button className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-sm shadow-indigo-200">
                    Start for free
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </Link>
                <a href="#features" className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition">
                  See how it works
                </a>
              </div>

              {/* Social proof */}
              <div className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {["RK", "SM", "AJ", "NP"].map((init) => (
                    <div key={init} className="h-8 w-8 rounded-full border-2 border-white bg-indigo-600 grid place-items-center text-white text-[10px] font-bold">
                      {init}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-500">
                  Loved by <span className="font-semibold text-slate-900">10,000+</span> users worldwide
                </p>
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200 overflow-hidden">
                {/* Fake top bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="h-3 w-3 rounded-full bg-red-300" />
                  <div className="h-3 w-3 rounded-full bg-amber-300" />
                  <div className="h-3 w-3 rounded-full bg-emerald-300" />
                  <div className="flex-1 mx-4 h-5 rounded-md bg-slate-200" />
                </div>

                {/* Fake content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-32 bg-slate-100 rounded-lg" />
                    <div className="h-7 w-20 bg-indigo-100 rounded-lg" />
                  </div>
                  {[80, 60, 90, 45].map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className={`h-3 rounded-md bg-slate-100`} style={{ width: `${w}%` }} />
                        <div className="h-2.5 w-2/5 rounded-md bg-slate-100" />
                      </div>
                      <div className="h-6 w-16 rounded-full bg-emerald-50 ring-1 ring-emerald-100" />
                    </div>
                  ))}

                  {/* Fake chart bar */}
                  <div className="mt-2 rounded-xl border border-slate-100 p-4 flex items-end gap-2 h-24">
                    {[40, 65, 55, 80, 70, 90, 60].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-md bg-indigo-100"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-6 rounded-2xl border border-slate-200 bg-white shadow-lg px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 grid place-items-center text-emerald-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">Email sent!</div>
                  <div className="text-xs text-slate-500">AI drafted in 2s</div>
                </div>
              </div>

              {/* Floating badge 2 */}
              <div className="absolute -top-4 -right-4 rounded-2xl border border-slate-200 bg-white shadow-lg px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center text-indigo-600">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">10× faster</div>
                  <div className="text-xs text-slate-500">Powered by AI</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGO STRIP ── */}
      <section className="border-y border-slate-100 bg-slate-50 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-8">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {logos.map((name) => (
              <div key={name} className="text-xl font-bold text-slate-300 tracking-tight hover:text-slate-400 transition cursor-default">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-indigo-50 text-indigo-700 ring-indigo-100 mb-4">
              Features
            </span>
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
              Everything your team needs
            </h2>
            <p className="mt-4 text-slate-500 text-lg">
              One workspace. AI email, task boards, document chat, and permissions — all connected.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className={`h-11 w-11 rounded-2xl ring-1 grid place-items-center mb-5 ${f.tone}`}>
                  {f.icon}
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-base font-semibold text-slate-900">{f.title}</div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${f.tone}`}>
                    {f.badge}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPLIT FEATURE HIGHLIGHT ── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 bg-indigo-50 text-indigo-700 ring-indigo-100 mb-6">
                AI Email Assistant
              </span>
              <h2 className="text-4xl font-bold text-slate-900 leading-tight tracking-tight">
                Write emails in seconds,<br />
                <span className="text-indigo-600">not minutes.</span>
              </h2>
              <p className="mt-5 text-slate-500 text-lg leading-relaxed">
                Just describe what you want to say. Chrono generates a full subject + body with your chosen tone — angry, polite, or professional.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Choose from 3 AI tones",
                  "Confirm recipient before sending",
                  "Rewrite drafts instantly",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-50 ring-1 ring-emerald-100 grid place-items-center shrink-0">
                      <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-700 font-medium">{item}</span>
                  </div>
                ))}
              </div>

              <Link href="/create-account">
                <button className="mt-10 flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 transition shadow-sm">
                  Try it free
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </Link>
            </div>

            {/* Right — fake email chat UI */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
              {/* Topbar */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Email Assistant</div>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-100">
                  AI Ready
                </span>
              </div>

              <div className="p-5 space-y-3 bg-slate-50">
                {/* User message */}
                <div className="ml-auto max-w-[85%] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="text-[10px] font-semibold text-slate-500 mb-1">You</div>
                  <p className="text-xs text-slate-800">Write an email about my absence on 19 Dec due to headache.</p>
                </div>

                {/* AI reply */}
                <div className="mr-auto max-w-[85%] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="text-[10px] font-semibold text-indigo-500 mb-1">Chrono AI</div>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    <span className="font-semibold">Subject:</span> Absence on 19 Dec 2025<br /><br />
                    Dear Team, I am writing to inform you that I was unable to attend work on 19 December due to a severe headache…
                  </p>
                </div>

                {/* Tone selector */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="text-[10px] font-semibold text-slate-500 mb-2">Select tone</div>
                  <div className="flex gap-2 flex-wrap">
                    {["Angry / Firm", "Professional", "Sweet / Polite"].map((t, i) => (
                      <span key={t} className={`text-[10px] font-semibold rounded-lg px-2.5 py-1 border ${i === 1 ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200"}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Composer */}
              <div className="px-4 py-3 border-t border-slate-100 bg-white flex gap-2">
                <div className="flex-1 h-9 rounded-xl bg-slate-50 border border-slate-200" />
                <div className="h-9 w-16 rounded-xl bg-indigo-600 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ── CTA BANNER ── */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Ready to work<br />
            <span className="text-indigo-400">10× smarter?</span>
          </h2>
          <p className="mt-5 text-slate-400 text-lg">
            Join 10,000+ users. Free forever. No credit card required.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/create-account">
              <button className="flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition shadow-sm shadow-indigo-900">
                Get started for free
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </Link>
            <Link href="/login">
              <button className="px-8 py-4 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition">
                Sign in
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
