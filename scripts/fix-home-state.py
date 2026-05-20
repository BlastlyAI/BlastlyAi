#!/usr/bin/env python3
content = open("/home/ubuntu/promoflow-ai/client/src/pages/Home.tsx").read()

old = "// ── Main component ─────────────────────────────────────────────────────────\nexport default function Home() {\n  const { user, isAuthenticated } = useAuth();\n  const [, navigate] = useLocation();\n\n  const loginUrl = getLoginUrl();\n\n  return ("

new = """// ── Inline scan types ─────────────────────────────────────────────────────
type PlatformScore = {
  platform: string; found: boolean; url?: string | null; handle?: string | null;
  followers?: number | null; score: number; grade: string; isActive?: boolean;
  isDormant?: boolean; strengths?: string[]; weaknesses?: string[]; recommendations?: string[];
  postingFrequency?: string;
};
type ScanResult = {
  websiteUrl: string; brandName: string; brandIndustry: string;
  overallScore: number; overallGrade: string; overallSummary: string;
  websiteSeoScore: number;
  discoveredProfiles: { platform: string; url: string; handle: string; found: boolean }[];
  platformScores: PlatformScore[];
  platformGapAnalysis: { missingPlatforms: { platform: string; priority: string; reason: string }[]; gapScore: number; summary: string };
  contentConsistency: { score: number; issues: string[]; summary: string };
  postingCadence: { overallHealth: string; dormantAccounts: string[]; activeAccounts: string[]; summary: string; recommendation: string };
  aiVisibilityScore: { score: number; grade: string; likelyMentionedInAI: boolean; factors: string[]; summary: string; recommendations: string[] };
  actionPlan: { week: number; priority: string; platform: string; action: string; description: string; estimatedImpact: string; canCreateInBlastly: boolean }[];
  topRecommendations: { priority: string; platform: string; issue: string; fix: string }[];
  isSaved: boolean;
};

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "text-blue-400", instagram: "text-pink-400", tiktok: "text-slate-300",
  youtube: "text-red-400", linkedin: "text-sky-400", twitter: "text-slate-300",
  pinterest: "text-rose-400", snapchat: "text-yellow-400", threads: "text-slate-300",
};

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-400";
  if (grade.startsWith("B")) return "text-blue-400";
  if (grade.startsWith("C")) return "text-amber-400";
  return "text-red-400";
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const loginUrl = getLoginUrl();
  const [scanUrl, setScanUrl] = React.useState("");
  const [scanResult, setScanResult] = React.useState<ScanResult | null>(null);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const publicScan = trpc.socialScan.publicScanPresence.useMutation({
    onSuccess: (data) => {
      setScanResult(data as ScanResult);
      setScanError(null);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    onError: (err) => {
      setScanError(err.message || "Scan failed. Please check the URL and try again.");
    },
  });

  function handleScan() {
    if (!scanUrl.trim()) return;
    let url = scanUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    setScanResult(null);
    setScanError(null);
    publicScan.mutate({ websiteUrl: url });
  }

  return ("""

if old not in content:
    print("ERROR: target string not found. Showing nearby context...")
    idx = content.find("// ── Main component")
    print(repr(content[idx:idx+400]))
else:
    content = content.replace(old, new, 1)
    open("/home/ubuntu/promoflow-ai/client/src/pages/Home.tsx", "w").write(content)
    print(f"SUCCESS: {len(content.splitlines())} lines total")
