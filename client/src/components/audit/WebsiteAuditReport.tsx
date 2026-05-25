import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Globe,
  HelpCircle,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuditReportRow } from "@/lib/auditApi";
import {
  type AuditCheck,
  type AuditSection,
  faviconUrlForHost,
  hostnameFromWebsite,
  overallWebsiteScore,
  scoreBand,
  scoreBandLabel,
  type WebsiteAuditData,
} from "@/lib/websiteAuditBuilder";

type WebsiteAuditReportProps = {
  report: AuditReportRow;
  onShare: () => void;
  copied: boolean;
  onContinue: () => void;
};

function bandStyles(band: "green" | "yellow" | "red") {
  if (band === "green")
    return {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/35",
      ring: "ring-emerald-500/20",
      bar: "from-emerald-400 to-emerald-500",
    };
  if (band === "yellow")
    return {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/35",
      ring: "ring-amber-500/20",
      bar: "from-amber-400 to-amber-500",
    };
  return {
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/35",
    ring: "ring-rose-500/20",
    bar: "from-rose-400 to-rose-500",
  };
}

function StatusIcon({ status }: { status: AuditCheck["status"] }) {
  if (status === "pass") return <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  if (status === "fail") return <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  if (status === "warn") return <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  return <HelpCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
}

function SectionCard({
  title,
  section,
}: {
  title: string;
  section: AuditSection;
}) {
  const band = scoreBand(section.score);
  const styles = bandStyles(band);

  return (
    <div className="glass-card-glow rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <div className={`flex items-center gap-2 rounded-full px-3 py-1 border ${styles.bg} ${styles.border}`}>
          <span className={`text-lg font-black tabular-nums ${styles.text}`}>{section.score}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${styles.bar} transition-all duration-700`}
          style={{ width: `${section.score}%` }}
        />
      </div>
      <ul className="space-y-3">
        {section.checks.map((check) => (
          <li key={check.label} className="flex gap-3 text-sm">
            <StatusIcon status={check.status} />
            <div className="min-w-0">
              <p className="font-medium text-foreground/90">{check.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function displayValue(value: string | null | undefined, fallback = "Not detected"): string {
  if (!value || !value.trim()) return fallback;
  return value;
}

function displayList(values: string[] | undefined, fallback = "Not detected"): string {
  if (!values?.length) return fallback;
  return values.join(" · ");
}

function DetectedFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-emerald-400/90 mb-1">Detected from your site</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5 break-all">{value}</p>
    </div>
  );
}

export default function WebsiteAuditReport({
  report,
  onShare,
  copied,
  onContinue,
}: WebsiteAuditReportProps) {
  const raw = report.rawReport as Record<string, unknown>;
  const wa = raw.websiteAudit as WebsiteAuditData | undefined;
  const website = report.website ?? (raw.website as string) ?? "";
  const host = hostnameFromWebsite(website);
  const favicon = wa?.faviconUrl ?? faviconUrlForHost(host);
  const overall = wa ? overallWebsiteScore(wa) : (report.overallScore ?? 0);
  const band = scoreBand(overall);
  const styles = bandStyles(band);
  const summary =
    wa?.scoreSummary ??
    (raw.summary as string) ??
    report.description ??
    "Website analysis complete.";

  if (!wa) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        Website audit data unavailable for this report.
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.09 0.015 250)" }}>
      <nav className="sticky top-0 z-20 border-b border-white/10 px-4 py-3 flex items-center justify-between backdrop-blur-xl bg-[oklch(0.09_0.015_250/0.85)]">
        <a href="/" className="flex items-center gap-2">
          <img
            src="/manus-storage/blastly-icon-512_d2809e7c.png"
            alt="Blastly"
            className="w-8 h-8 rounded-lg"
          />
          <span className="font-bold text-foreground">Blastly</span>
        </a>
        <Button variant="outline" size="sm" onClick={onShare} className="gap-1.5 text-xs border-white/15">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Share"}
        </Button>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Hero — business identity */}
        <header className="glass-card-glow rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 audit-analyzing-bg opacity-30 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-16 h-16 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={favicon}
                alt=""
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/90 mb-2">
                Website audit · Generated from your URL
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-foreground truncate">{report.businessName}</h1>
              <a
                href={wa.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-emerald-400/90 hover:text-emerald-300 mt-1 truncate max-w-full"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                {wa.websiteUrl.replace(/^https?:\/\//, "")}
              </a>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{summary}</p>
              {wa.dataConfidence !== "scraped" && (
                <p className="text-xs text-amber-400/90 mt-2">
                  {wa.dataConfidence === "failed"
                    ? "Unable to analyze — we could not fetch this website."
                    : "Partial analysis — some signals could not be extracted from the homepage."}
                </p>
              )}
            </div>
            <div
              className={`shrink-0 text-center rounded-2xl px-5 py-4 border ring-4 ${styles.bg} ${styles.border} ${styles.ring}`}
            >
              <div className={`text-4xl font-black tabular-nums ${styles.text}`}>{overall}</div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Overall score</p>
              <p className={`text-xs font-semibold mt-1 ${styles.text}`}>{scoreBandLabel(overall)}</p>
            </div>
          </div>
        </header>

        {/* Detected business context */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
            What we found on your website
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <DetectedFact label="Business type" value={displayValue(wa.businessType?.replace(/_/g, " "))} />
            <DetectedFact label="Page title" value={displayValue(wa.pageTitle === "Not detected" ? null : wa.pageTitle)} />
            <DetectedFact label="Meta title" value={displayValue(wa.metaTitle === "Not detected" ? null : wa.metaTitle)} />
            <DetectedFact label="Hero headline" value={displayValue(wa.heroHeadline)} />
            <DetectedFact label="Primary CTAs" value={displayList(wa.ctaButtons)} />
            <DetectedFact label="Email" value={displayValue(wa.footerInfo.email)} />
            <DetectedFact label="Phone" value={displayValue(wa.footerInfo.phone)} />
            <DetectedFact label="Services detected" value={displayList(wa.services, "Not detected")} />
            <DetectedFact label="Products detected" value={displayList(wa.products, "Not detected")} />
            {wa.brandingColors.length > 0 && (
              <DetectedFact
                label="Branding colours"
                value={
                  <span className="inline-flex gap-1.5 mt-1">
                    {wa.brandingColors.map((c) => (
                      <span
                        key={c}
                        className="w-6 h-6 rounded-md border border-white/20"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </span>
                }
              />
            )}
          </div>
          <div className="glass-card rounded-xl p-4 flex flex-wrap gap-3">
            {wa.socialLinks.map((s) => (
              <span
                key={s.platform}
                className={`text-xs px-3 py-1.5 rounded-full border ${s.detected
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-white/5 text-muted-foreground"
                  }`}
              >
                {s.detected ? "✓" : "—"} {s.platform}
              </span>
            ))}
            <span className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-muted-foreground">
              {wa.technical.https ? "✓ HTTPS" : "— HTTPS"}
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-muted-foreground">
              Blog: {wa.technical.blogDetected ? "detected" : "not found"}
            </span>
            <span className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-muted-foreground">
              Speed: {wa.technical.pageSpeedEstimate}
            </span>
          </div>
        </section>

        {/* AI insights */}
        <section className="glass-card-glow rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-bold">Smart observations</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Based on structure and content signals from {host} — not generic templates.
          </p>
          <ul className="space-y-3">
            {wa.aiInsights.length > 0 ? (
              wa.aiInsights.map((insight, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground/85 leading-relaxed pl-4 border-l-2 border-violet-500/40"
                >
                  {insight}
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">Unable to analyze — no insights generated from extracted data.</li>
            )}
          </ul>
        </section>

        {/* Analysis sections */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
            Detailed analysis
          </h2>
          <SectionCard title="Branding" section={wa.sections.branding} />
          <SectionCard title="Performance" section={wa.sections.performance} />
          <SectionCard title="Content quality" section={wa.sections.content} />
          <SectionCard title="SEO foundations" section={wa.sections.seo} />
          <SectionCard title="Social & trust" section={wa.sections.socialTrust} />
        </section>

        {/* CTA — onboarding, no fake metrics */}
        <div className="glass-card-glow rounded-2xl p-6 text-center space-y-4">
          <h3 className="text-lg font-bold">Ready to improve {report.businessName}?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Blastly pre-filled your business profile from this audit. Continue to confirm details and launch your
            marketing setup.
          </p>
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2 font-bold text-white px-8"
            style={{
              background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))",
            }}
            onClick={onContinue}
          >
            Continue with pre-filled onboarding
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-[11px] text-muted-foreground">14-day free trial · No credit card to start</p>
        </div>

        <div className="text-center pb-8">
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => window.location.href = "/"}>
            ← Audit another website
          </Button>
        </div>
      </div>
    </div>
  );
}
