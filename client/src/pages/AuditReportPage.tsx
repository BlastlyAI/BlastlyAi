import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuditReport } from "@/hooks/useAuditReport";
import WebsiteAuditReport from "@/components/audit/WebsiteAuditReport";
import { normalizeAuditReportRow } from "@/lib/auditApi";

export default function AuditReportPage() {
  const [, params] = useRoute("/audit/report/:token");
  const token = params?.token ?? "";
  const [copied, setCopied] = useState(false);
  const [, navigate] = useLocation();

  const { data: report, isLoading, error } = useAuditReport(token, !!token);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.09 0.015 250)" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-muted-foreground text-sm phase1-audit-message">Analyzing your website…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.09 0.015 250)" }}>
        <div className="text-center">
          <p className="font-semibold text-foreground">Report not found</p>
          <p className="text-sm text-muted-foreground mt-1">This link may have expired.</p>
          <Button className="mt-4" onClick={() => navigate("/")}>
            Start new audit
          </Button>
        </div>
      </div>
    );
  }

  const normalized = normalizeAuditReportRow(report as Record<string, unknown>);

  return (
    <WebsiteAuditReport
      report={normalized}
      onShare={handleShare}
      copied={copied}
      onContinue={() => navigate(`/onboarding/managed?audit=${token}`)}
    />
  );
}

