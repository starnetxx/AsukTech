import React from 'react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1B12] via-[#0E2116] to-[#0B1B12] relative text-white">
      {/* Accessible skip link */}
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-lg">
        Skip to content
      </a>
      {/* Subtle grid pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Header */}
      <header className="max-w-6xl mx-auto px-5 pt-6 pb-3 flex items-center justify-between" role="banner" aria-label="Site header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34A853] to-[#2E7D32] flex items-center justify-center shadow-lg border border-white/10">
            <img src="/starline-logo.png" alt="AsukTek" className="w-6 h-6 object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight">AsukTek</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm" aria-label="Primary">
          <a href="#features" className="text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-md px-1">Services</a>
          <a href="#pricing" className="text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-md px-1">Pricing</a>
          <a href="#contact" className="text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-md px-1">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href="/login" className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 border border-white/20 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            Sign in
          </a>
          <a href="/login" className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#34A853] hover:bg-[#2E7D32] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34A853]/60">
            Create account
          </a>
        </div>
      </header>

      {/* Hero */}
      <main id="main" className="max-w-6xl mx-auto px-5 pb-24" role="main">
        <section className="pt-10 md:grid md:grid-cols-2 md:gap-12 md:items-center">
          {/* Left column: badge, headline, subheadline */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold mb-6 md:mb-8 w-max mx-auto md:mx-0">
              <span className="w-2 h-2 rounded-full bg-[#34A853]"></span>
              New • Virtual accounts + faster top‑ups
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Wi‑Fi plans, wallet, and virtual accounts—simplified.
            </h1>
            <p className="text-white/80 mt-4 leading-relaxed max-w-[60ch] mx-auto md:mx-0">
              AsukTek lets you purchase flexible Wi‑Fi plans, fund a smart wallet, and receive
              payments via your own virtual bank account. Top‑up instantly, transfer securely,
              and track usage—all in one place.
            </p>
          </div>

          {/* Right column: bullets and CTAs */}
          <div className="mt-6 md:mt-0 text-left md:self-stretch md:flex md:flex-col md:justify-center">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-none">
              <li className="flex items-center gap-2 text-white/85"><span className="w-1.5 h-1.5 rounded-full bg-[#34A853]"></span>Pay‑as‑you‑go & hourly/daily plans</li>
              <li className="flex items-center gap-2 text-white/85"><span className="w-1.5 h-1.5 rounded-full bg-[#34A853]"></span>Instant wallet top‑ups (Flutterwave)</li>
              <li className="flex items-center gap-2 text-white/85"><span className="w-1.5 h-1.5 rounded-full bg-[#34A853]"></span>Personal virtual account for deposits</li>
              <li className="flex items-center gap-2 text-white/85"><span className="w-1.5 h-1.5 rounded-full bg-[#34A853]"></span>Secure transfers and receipts</li>
            </ul>

            <div className="mt-6 flex items-center justify-start gap-3">
              <a href="/login" className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#34A853] hover:bg-[#2E7D32] font-semibold shadow-lg shadow-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#34A853]/60">
                Create account
              </a>
              <a href="/AsukTek.apk" download className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15 font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                Download App
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5 5m0 0l5-5m-5 5V3" />
                </svg>
              </a>
            </div>
          </div>
        </section>

        {/* Feature cards for quick scanning */}
        <section id="features" className="mt-16 grid md:grid-cols-3 gap-4">
          {[
            { title: 'Flexible Wi‑Fi Plans', body: 'Choose hourly, daily, or weekly data plans that fit your usage.' },
            { title: 'Smart Wallet', body: 'Top‑up instantly, track balance, and secure transfers with receipts.' },
            { title: 'Virtual Account', body: 'Get a personal account number for easier funding and payouts.' },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-white/80 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        {/* Contact */}
        <section id="contact" className="mt-16">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
            <h2 className="text-white font-bold text-sm mb-2">Contact</h2>
            <div className="text-sm text-white/85 space-y-2">
              <p className="font-semibold">AsukTek behind sabon layi behind sabon layi round about</p>
              <p>
                Phone: <a href="tel:08033707947" className="font-semibold text-white hover:underline">08033707947</a>, <a href="tel:08036506511" className="font-semibold text-white hover:underline">08036506511</a>
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-white/60" role="contentinfo">
          © {new Date().getFullYear()} AsukTek. All rights reserved.
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;


