import re

content = open('/home/ubuntu/promoflow-ai/client/src/pages/Home.tsx').read()

# New hero section — direct, simple, URL input front and centre with sample preview
new_hero = '''      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16 pb-20">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, oklch(0.58 0.22 250 / 0.12), transparent 70%)" }} />
          <div className="absolute top-20 right-1/4 w-80 h-80 rounded-full opacity-6"
            style={{ background: "radial-gradient(circle, oklch(0.68 0.18 165 / 0.10), transparent 70%)" }} />
        </div>
        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Simple, direct headline */}
            <h1 className="font-extrabold text-foreground mb-4" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", letterSpacing: "-0.03em", lineHeight: "1.15" }}>
              Enter your website.
              <br />
              <span className="gradient-text">See your full digital picture.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Blastly scans your website, finds all your social media accounts automatically, scores each one, and shows you exactly how you compare to your 5 nearest competitors — in under 60 seconds. Free.
            </p>

            {/* ── URL Input — the primary CTA ── */}
            <div className="max-w-2xl mx-auto mb-4">
              <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border border-border bg-card shadow-lg shadow-primary/5">
                <div className="flex items-center gap-2 flex-1 px-3">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground text-sm flex-1 text-left">yourwebsite.com</span>
                </div>
                <Button
                  size="lg"
                  className="btn-gradient text-white border-0 h-11 px-8 text-sm font-semibold whitespace-nowrap"
                  onClick={() => {
                    if (isAuthenticated) navigate("/dashboard/digital-presence");
                    else window.location.href = loginUrl;
                  }}
                >
                  Scan My Business Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">No credit card. No sign-up required to preview. Takes 60 seconds.</p>
            </div>

            {/* ── Sample Report Preview — show what they'll get ── */}
            <div className="max-w-3xl mx-auto mt-10 rounded-2xl border border-border bg-card shadow-xl shadow-primary/5 overflow-hidden">
              {/* Report header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs text-muted-foreground font-mono">blastly.io/report — example.com.au</span>
                </div>
                <span className="text-[10px] text-muted-foreground bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">Live Sample</span>
              </div>
              {/* Report body */}
              <div className="p-5 space-y-4">
                {/* Score row */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-full border-4 border-violet-500/40 flex items-center justify-center bg-violet-500/10">
                    <span className="text-xl font-extrabold text-violet-400">84</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-semibold text-foreground">Digital Presence Score</div>
                    <div className="text-xs text-muted-foreground mb-1.5">Grade A — Strong presence, 2 gaps found</div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-gradient-to-r from-violet-500 to-blue-500 h-1.5 rounded-full" style={{width: '84%'}} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    <div className="text-xs text-muted-foreground">vs. top competitor</div>
                    <div className="text-sm font-bold text-emerald-400">+12 pts ahead</div>
                  </div>
                </div>
                {/* Platform grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { label: "Facebook", score: 72, color: "text-blue-400", found: true },
                    { label: "Instagram", score: 88, color: "text-pink-400", found: true },
                    { label: "TikTok", score: 0, color: "text-slate-400", found: false },
                    { label: "YouTube", score: 65, color: "text-red-400", found: true },
                    { label: "LinkedIn", score: 91, color: "text-sky-400", found: true },
                    { label: "X", score: 0, color: "text-slate-400", found: false },
                  ].map(({ label, score, color, found }) => (
                    <div key={label} className={`p-2 rounded-lg text-center ${found ? 'bg-muted/40' : 'bg-red-500/8 border border-red-500/20'}`}>
                      <div className={`text-[10px] font-semibold ${color}`}>{label}</div>
                      <div className={`text-sm font-bold ${found ? 'text-foreground' : 'text-red-400'}`}>{found ? score : '—'}</div>
                      <div className="text-[9px] text-muted-foreground">{found ? '/100' : 'Missing'}</div>
                    </div>
                  ))}
                </div>
                {/* AI insight strip */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20">
                  <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300 text-left"><span className="font-semibold">Top opportunity:</span> Your TikTok account is missing — your #1 competitor has 14,200 followers there. Claiming it this week could add ~800 monthly visitors.</p>
                </div>
                {/* Competitor row */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <Target className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="text-xs font-semibold text-foreground">5 Competitors Scanned</div>
                    <div className="text-[10px] text-muted-foreground">competitor1.com.au · competitor2.com.au · +3 more</div>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold whitespace-nowrap">See full report →</div>
                </div>
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1.5">
                  {["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500"].map((c, i) => (
                    <div key={i} className={`w-6 h-6 rounded-full border-2 border-background ${c}`} />
                  ))}
                </div>
                <span>2,400+ businesses scanned</span>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                <span className="ml-1">4.9/5</span>
              </div>
            </div>
          </div>
        </div>
      </section>'''

# Find and replace the hero section
old_start = '      {/* ── Hero ── */}\n      <section className="relative overflow-hidden pt-20 pb-24">'
old_end = '      </section>\n\n      {/* ── Stats bar ── */}\n      <section className="border-y border-border bg-card/50">'

start_idx = content.find(old_start)
end_idx = content.find(old_end)

if start_idx == -1:
    print("ERROR: Could not find hero start")
elif end_idx == -1:
    print("ERROR: Could not find hero end")
else:
    stats_bar_section = '\n      {/* ── Stats bar ── */}\n      <section className="border-y border-border bg-card/50">'
    new_content = content[:start_idx] + new_hero + stats_bar_section + content[end_idx + len(old_end):]
    open('/home/ubuntu/promoflow-ai/client/src/pages/Home.tsx', 'w').write(new_content)
    print(f"Done. File size: {len(new_content)} chars")
