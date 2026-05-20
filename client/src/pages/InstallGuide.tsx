/**
 * InstallGuide — /install
 *
 * Ultra-simple: one button opens Safari with Blastly ready.
 * Then 2 quick steps to pin it to the home screen.
 */

import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Apple, Smartphone, CheckCircle2, ExternalLink } from "lucide-react";

type Platform = "iphone" | "android";

export default function InstallGuide() {
  const [platform, setPlatform] = useState<Platform>("iphone");
  const [done, setDone] = useState(false);

  const appUrl = "https://www.blastly.ai/dashboard/quick-capture";

  function openInSafari() {
    // Opens the Blastly Quick Post URL — on iPhone this opens in Safari
    window.open(appUrl, "_blank");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Blastly
        </Link>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto w-full">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">📱</div>
          <h1 className="text-2xl font-bold mb-3">Add Blastly to your phone</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            One tap below opens Blastly in Safari, ready to pin to your home screen.
            After that, say <span className="text-white font-semibold">"Hey Siri, Blastly Post"</span> and you're live.
          </p>
        </div>

        {/* Platform toggle */}
        <div className="flex gap-2 bg-white/5 rounded-2xl p-1.5 mb-8 w-full">
          <button
            onClick={() => setPlatform("iphone")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
              platform === "iphone" ? "bg-white text-black shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Apple className="w-4 h-4" />
            iPhone
          </button>
          <button
            onClick={() => setPlatform("android")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
              platform === "android" ? "bg-white text-black shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Android
          </button>
        </div>

        {platform === "iphone" ? (
          <div className="w-full space-y-4">

            {/* Big launch button */}
            <button
              onClick={openInSafari}
              className="w-full py-5 rounded-2xl text-lg font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))",
                boxShadow: "0 8px 32px oklch(0.52 0.22 145 / 0.40)",
              }}
            >
              <ExternalLink className="w-5 h-5" />
              Open Blastly in Safari
            </button>

            <p className="text-center text-xs text-slate-500">
              This opens Blastly directly in Safari — required for adding to your home screen.
            </p>

            {/* Two-step instructions */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 mt-2">
              <p className="text-sm font-semibold text-white mb-1">Then do these 2 quick steps:</p>

              <div className="flex gap-4 items-start">
                <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">1</div>
                <div>
                  <p className="text-sm font-medium text-white">Tap the Share button <span className="text-slate-400 font-normal">(the box with an arrow ↑ at the bottom of Safari)</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">Then scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">2</div>
                <div>
                  <p className="text-sm font-medium text-white">Name it <strong>"Blastly"</strong> and tap <strong>Add</strong></p>
                  <p className="text-xs text-slate-500 mt-0.5">Blastly appears on your home screen like a native app.</p>
                </div>
              </div>

              <button
                onClick={() => setDone(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors mt-1"
              >
                ✓ Done — I've added it
              </button>
            </div>

            {/* After adding — Siri setup */}
            {done && (
              <div
                className="rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ background: "oklch(0.18 0.06 280 / 0.60)", border: "1px solid oklch(0.45 0.15 280 / 0.40)" }}
              >
                <p className="text-sm font-bold text-white">🎉 Blastly is on your phone!</p>
                <p className="text-sm text-slate-300">
                  Now set up your voice shortcut so you can post without even unlocking your phone:
                </p>
                <a
                  href={`shortcuts://create-shortcut?url=${encodeURIComponent(appUrl)}&name=Blastly%20Post`}
                  className="block w-full py-3 rounded-xl text-sm font-bold text-white text-center transition-all"
                  style={{ background: "oklch(0.55 0.20 280)" }}
                >
                  🎤 Set up "Hey Siri, Blastly Post"
                </a>
                <p className="text-xs text-slate-500 text-center">
                  Opens Shortcuts app with everything pre-filled — just speak the phrase once.
                </p>
              </div>
            )}

            {/* App Store note */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center mt-2">
              <p className="text-xs text-slate-500">
                <span className="text-white font-medium">Coming soon:</span> Blastly native iOS app — one tap in the App Store, then say "Post a photo to Blastly" and the camera opens directly.
              </p>
            </div>
          </div>

        ) : (
          <div className="w-full space-y-4">

            {/* Android: Chrome opens the URL directly */}
            <button
              onClick={openInSafari}
              className="w-full py-5 rounded-2xl text-lg font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))",
                boxShadow: "0 8px 32px oklch(0.52 0.22 145 / 0.40)",
              }}
            >
              <ExternalLink className="w-5 h-5" />
              Open Blastly
            </button>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
              <p className="text-sm font-semibold text-white mb-1">Then add it to your home screen:</p>

              <div className="flex gap-4 items-start">
                <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">1</div>
                <div>
                  <p className="text-sm font-medium text-white">Tap the three-dot menu <span className="text-slate-400 font-normal">(⋮ top right in Chrome)</span></p>
                  <p className="text-xs text-slate-500 mt-0.5">Or tap the <strong className="text-white">"Install app"</strong> banner if it appears at the bottom</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">2</div>
                <div>
                  <p className="text-sm font-medium text-white">Tap <strong>"Add to Home screen"</strong> → <strong>Add</strong></p>
                  <p className="text-xs text-slate-500 mt-0.5">Blastly appears in your app drawer and home screen.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-sm text-slate-400">
                <span className="text-white font-medium">Voice shortcut:</span> Just say{" "}
                <span className="text-emerald-400 font-semibold">"OK Google, open Blastly"</span>{" "}
                — works right now, no setup needed.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-200">
                Blastly is now on your home screen. Tap it anytime to post in under 20 seconds.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
