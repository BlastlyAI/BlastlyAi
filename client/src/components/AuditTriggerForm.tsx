import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runAuditApi } from "@/lib/auditApi";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  normalizeWebsiteUrl,
  PHASE1_LOADING_MESSAGES,
  triggerPhase1Audit,
} from "@/lib/auditTrigger";
import { savePhase1AuditUrl } from "@/lib/phase1AuditSession";

type AuditTriggerFormProps = {
  variant?: "card" | "hero";
  inputId?: string;
  placeholder?: string;
  className?: string;
};

export default function AuditTriggerForm({
  variant = "card",
  inputId = "audit-input",
  placeholder = "Enter your website — e.g. yourcompany.com",
  className = "",
}: AuditTriggerFormProps) {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    setMessageIndex(0);
    const timer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % PHASE1_LOADING_MESSAGES.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [isLoading]);

  const submit = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      document.getElementById(inputId)?.focus();
      return;
    }

    const normalised = normalizeWebsiteUrl(trimmed);
    setIsLoading(true);

    try {
      void triggerPhase1Audit(normalised).catch(() => {
        /* Make.com orchestration optional */
      });
      savePhase1AuditUrl(normalised);
      const result = await runAuditApi({
        businessName: normalised,
        website: normalised,
        workspaceId: isAuthenticated ? currentWorkspace?.supabaseId ?? null : null,
      });
      navigate(`/audit/report/${result.shareToken}`);
    } catch {
      toast.error("Unable to analyze this website right now. Please try again.");
      setIsLoading(false);
    }
  }, [url, inputId, navigate, isAuthenticated, currentWorkspace?.supabaseId]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  if (variant === "hero") {
    return (
      <form onSubmit={handleSubmit} className={`max-w-xl mx-auto ${className}`}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            id={inputId}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourwebsite.com.au"
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 border focus:outline-none focus:border-emerald-400/60 transition-colors disabled:opacity-60"
            style={{
              background: "oklch(0.16 0.012 245 / 0.90)",
              border: "2px solid rgba(255,255,255,0.55)",
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 rounded-xl text-sm font-bold text-white whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 disabled:opacity-70 transition-opacity"
            style={{
              background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))",
              boxShadow: "0 4px 20px oklch(0.52 0.22 145 / 0.35)",
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Business…
              </>
            ) : (
              <>Start Free Audit</>
            )}
          </button>
        </div>
        {isLoading && (
          <p
            key={messageIndex}
            className="text-center text-sm mt-4 phase1-audit-message"
            style={{ color: "oklch(0.65 0.18 145)" }}
          >
            {PHASE1_LOADING_MESSAGES[messageIndex]}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-2 rounded-2xl"
        style={{
          background: "oklch(0.17 0.012 245 / 0.90)",
          border: "1px solid oklch(0.62 0.18 220 / 0.35)",
          boxShadow: "0 0 50px oklch(0.52 0.18 220 / 0.12), 0 8px 32px rgba(0,0,0,0.35)",
        }}
      >
        <Globe
          className="w-5 h-5 ml-3 flex-shrink-0"
          style={{ color: "oklch(0.62 0.18 220)" }}
        />
        <input
          id={inputId}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base px-2 py-2 disabled:opacity-60"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="submit"
          disabled={isLoading}
          size="default"
          className="btn-gradient text-white font-bold px-6 py-3 rounded-xl flex-shrink-0 text-base gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing Business…
            </>
          ) : (
            <>
              Start Free Audit
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>
      {isLoading && (
        <p
          key={messageIndex}
          className="text-sm font-medium mt-3 text-center phase1-audit-message"
          style={{ color: "oklch(0.72 0.14 165)" }}
        >
          {PHASE1_LOADING_MESSAGES[messageIndex]}
        </p>
      )}
      {!isLoading && (
        <p
          className="text-sm font-semibold mt-3 text-center"
          style={{ color: "oklch(0.78 0.10 220)" }}
        >
          No account needed · Results in 60 seconds · 100% free
        </p>
      )}
    </div>
  );
}
