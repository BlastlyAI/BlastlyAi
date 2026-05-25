import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { confirmBillingSessionApi } from "@/lib/billingApi";
import { getAppLoginPath } from "@/const";

const GOLD = "#d4a843";
const BG = "#02020c";
const TEXT = "#f0ede6";
const MUTED = "rgba(240,237,230,0.55)";

export default function UpgradeSuccessPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { assistantName, refetch, isPaid } = usePlanAccess();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"confirming" | "ready" | "pending">("confirming");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      window.location.href = getAppLoginPath("/upgrade/success");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setStatus("pending");
      return;
    }

    void (async () => {
      try {
        const result = await confirmBillingSessionApi(sessionId);
        await refetch();
        if (result.confirmed || result.billing?.isPaid) {
          setStatus("ready");
          toast.success("Welcome to Blastly Pro!");
          toast.success(`${assistantName || "Your AI Assistant"} is now active`);
          toast.success("Command Centre unlocked");
        } else {
          setStatus("pending");
          toast.info("Payment received — activating your account…");
        }
      } catch {
        setStatus("pending");
      }
    })();
  }, [authLoading, isAuthenticated, refetch, assistantName]);

  useEffect(() => {
    if (status !== "ready" && isPaid) setStatus("ready");
  }, [isPaid, status]);

  useEffect(() => {
    if (status !== "ready") return;
    const t = setTimeout(() => navigate("/command-centre"), 3500);
    return () => clearTimeout(t);
  }, [status, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: BG, color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {status === "confirming" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto" style={{ color: GOLD }} />
            <h1 className="text-2xl font-bold">Activating Blastly Pro…</h1>
            <p style={{ color: MUTED }}>Your audit and business data are already in place.</p>
          </>
        )}

        {status === "pending" && (
          <>
            <Sparkles className="w-12 h-12 mx-auto" style={{ color: GOLD }} />
            <h1 className="text-2xl font-bold">Almost there</h1>
            <p style={{ color: MUTED }}>
              Stripe confirmed payment. If Command Centre is not unlocked yet, refresh in a moment — webhook
              activation can take a few seconds.
            </p>
            <button
              type="button"
              onClick={() => void refetch().then(() => navigate("/command-centre"))}
              className="px-6 py-3 rounded-xl font-bold"
              style={{ background: GOLD, color: "#000" }}
            >
              Open Command Centre
            </button>
          </>
        )}

        {status === "ready" && (
          <>
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-400" />
            <h1 className="text-2xl font-bold">Welcome to Blastly Pro</h1>
            <ul className="text-left space-y-2 text-sm" style={{ color: MUTED }}>
              <li>✓ Command Centre unlocked</li>
              <li>✓ {assistantName || "Your AI Assistant"} is active</li>
              <li>✓ Audit & onboarding data preserved</li>
            </ul>
            <p className="text-sm" style={{ color: MUTED }}>
              Redirecting to Command Centre…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
