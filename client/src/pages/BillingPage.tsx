import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Check, CreditCard, Zap, ArrowRight, CheckCircle, Crown, Building2, ExternalLink,
  Wallet, AlertTriangle, TrendingUp, RefreshCw, ToggleLeft, ToggleRight, History,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type Billing = "monthly" | "annual";

const PLAN_DETAILS = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    borderColor: "border-border",
    icon: null,
    features: ["3 scans per month", "View-only reports", "Digital Presence Score", "AI Visibility Score"],
  },
  starter: {
    name: "Starter",
    monthlyPrice: 29,
    annualPrice: 290,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: Zap,
    features: ["Unlimited scans", "Full PDF reports", "AI Action Plan", "Scan history (90 days)", "Email alerts", "1 workspace"],
  },
  growth: {
    name: "Growth",
    monthlyPrice: 79,
    annualPrice: 790,
    color: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/20",
    borderColor: "border-violet-200 dark:border-violet-800",
    icon: Crown,
    features: ["Everything in Starter", "AI Content Generator", "Content Scheduler", "Weekly competitor re-scans", "White-label reports", "3 workspaces"],
  },
  agency: {
    name: "Agency",
    monthlyPrice: 199,
    annualPrice: 1990,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    icon: Building2,
    features: ["Everything in Growth", "Unlimited workspaces", "Bulk scan (50 sites)", "Agency dashboard", "White-labelled reports", "Priority support"],
  },
};

type PlanKey = keyof typeof PLAN_DETAILS;

// ─── Wallet Section ────────────────────────────────────────────────────────────
function WalletSection({ workspaceId }: { workspaceId: number }) {
  const utils = trpc.useUtils();
  const [showTransactions, setShowTransactions] = useState(false);

  const { data: wallet, isLoading } = trpc.wallet.getWallet.useQuery({ workspaceId });
  const { data: transactions } = trpc.wallet.getTransactions.useQuery(
    { workspaceId, limit: 10 },
    { enabled: showTransactions }
  );

  const topUp = trpc.wallet.createTopUpCheckout.useMutation({
    onSuccess: ({ checkoutUrl }) => {
      if (checkoutUrl) {
        toast.success("Redirecting to secure checkout…");
        window.open(checkoutUrl, "_blank");
      }
    },
    onError: (err) => toast.error(err.message || "Could not start checkout"),
  });

  const setAutoTopUp = trpc.wallet.setAutoTopUp.useMutation({
    onSuccess: () => {
      utils.wallet.getWallet.invalidate({ workspaceId });
      toast.success("Auto top-up settings saved");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
        <div className="h-5 bg-muted rounded w-40 mb-4" />
        <div className="h-12 bg-muted rounded w-full mb-3" />
        <div className="h-8 bg-muted rounded w-full" />
      </div>
    );
  }

  if (!wallet) return null;

  const balanceNum = parseFloat(wallet.balanceAud);
  const budgetNum = parseFloat(wallet.monthlyBudgetAud);
  const spentNum = parseFloat(wallet.spentThisMonthAud);
  const pct = budgetNum > 0 ? Math.min(100, Math.round((balanceNum / budgetNum) * 100)) : 0;

  const barColor = wallet.isCriticalBalance
    ? "bg-red-500"
    : wallet.isLowBalance
    ? "bg-amber-400"
    : "bg-emerald-500";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <Wallet className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Ad Budget Wallet</h2>
          <p className="text-xs text-muted-foreground">Your pre-paid ad spend balance · resets 1st of each month</p>
        </div>
      </div>

      {/* Low balance warning */}
      {wallet.isLowBalance && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-200">
            {wallet.isCriticalBalance
              ? "Critical: your balance is nearly empty. Top up now to keep your ads running."
              : "Low balance — top up before month end to avoid your ads pausing."}
          </p>
        </div>
      )}

      {/* Balance display */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Balance</p>
            <p className="text-4xl font-bold text-foreground">A${balanceNum.toFixed(0)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Monthly budget</p>
            <p className="text-lg font-semibold text-foreground">A${budgetNum.toFixed(0)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-2.5 mb-2">
          <div
            className={`h-2.5 rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{pct}% remaining</span>
          <span>A${spentNum.toFixed(0)} spent this month</span>
        </div>
      </div>

      {/* Top-up buttons */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Top up your balance</p>
        <div className="grid grid-cols-4 gap-2">
          {wallet.topUpAmounts.map((amt) => (
            <button
              key={amt.cents}
              onClick={() => topUp.mutate({ workspaceId, amountCents: amt.cents })}
              disabled={topUp.isPending}
              className="rounded-xl border border-border bg-muted/30 hover:bg-muted/60 hover:border-emerald-500/40 transition-all p-3 text-center disabled:opacity-50"
            >
              <p className="text-base font-bold text-foreground">A${amt.aud}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">one-off</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Secure payment via Stripe · Apple Pay, Google Pay, or card accepted
        </p>
      </div>

      {/* Auto top-up toggle */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Auto Top-Up</span>
            <Badge variant="outline" className="text-[10px]">Recommended</Badge>
          </div>
          <button
            onClick={() => setAutoTopUp.mutate({ workspaceId, enabled: !wallet.autoTopUp })}
            disabled={setAutoTopUp.isPending}
            className="transition-colors"
          >
            {wallet.autoTopUp
              ? <ToggleRight className="w-7 h-7 text-emerald-500" />
              : <ToggleLeft className="w-7 h-7 text-muted-foreground" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {wallet.autoTopUp
            ? `Automatically tops up by A$${wallet.autoTopUpAmountAud} when balance drops below A$${wallet.autoTopUpThresholdAud}.`
            : "Enable to automatically top up your wallet when the balance runs low — no more manual top-ups."}
        </p>
        {wallet.autoTopUp && (
          <p className="text-xs text-emerald-400 mt-1.5">
            A saved payment method is required. Visit the Stripe portal to add one.
          </p>
        )}
      </div>

      {/* Transaction history toggle */}
      <button
        onClick={() => setShowTransactions(!showTransactions)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="w-4 h-4" />
        {showTransactions ? "Hide" : "Show"} transaction history
      </button>

      {showTransactions && transactions && (
        <div className="rounded-xl border border-border overflow-hidden">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Description</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground">{t.description ?? t.type}</td>
                    <td className={`px-4 py-2.5 text-xs font-medium text-right ${t.amountCents >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                      {t.amountCents >= 0 ? "+" : ""}A${t.amountAud}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground text-right">A${t.balanceAfterAud}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [billing, setBilling] = useState<Billing>("monthly");
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: subscription } = trpc.stripe.getSubscription.useQuery();

  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => {
      setLoadingPlan(null);
      if (url) {
        toast.success("Redirecting to secure checkout...");
        window.open(url, "_blank");
      }
    },
    onError: (err) => {
      setLoadingPlan(null);
      toast.error(err.message || "Failed to create checkout session");
    },
  });

  const createPortal = trpc.stripe.createPortalSession.useMutation({
    onSuccess: ({ url }) => {
      setPortalLoading(false);
      if (url) window.open(url, "_blank");
    },
    onError: (err) => {
      setPortalLoading(false);
      toast.error(err.message || "Could not open billing portal");
    },
  });

  const handleUpgrade = (planKey: PlanKey) => {
    if (planKey === "free") return;
    setLoadingPlan(planKey);
    createCheckout.mutate({
      planKey: planKey as "starter" | "growth" | "agency",
      billing,
      origin: window.location.origin,
    });
  };

  const handleManageBilling = () => {
    setPortalLoading(true);
    createPortal.mutate({ origin: window.location.origin });
  };

  const currentPlan = (subscription?.plan ?? "free") as PlanKey;
  const currentPlanDetails = PLAN_DETAILS[currentPlan];
  const planOrder: PlanKey[] = ["free", "starter", "growth", "agency"];
  const currentPlanIndex = planOrder.indexOf(currentPlan);

  const getPrice = (plan: typeof PLAN_DETAILS[PlanKey]) =>
    billing === "annual" ? plan.annualPrice : plan.monthlyPrice;

  const getMonthlyEquiv = (plan: typeof PLAN_DETAILS[PlanKey]) =>
    billing === "annual" && plan.annualPrice > 0 ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;

  return (
    <AppLayout title="Billing & Upgrade">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Billing & Upgrade</h1>
              <p className="text-sm text-muted-foreground">Manage your subscription and plan · All prices in AUD</p>
            </div>
          </div>
        </div>

        {/* Ad Budget Wallet */}
        {wsId && <WalletSection workspaceId={wsId} />}

        {/* Free Trial Banner */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 mb-6 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">14-day free trial — no credit card required</p>
            <p className="text-sm text-muted-foreground mt-0.5">All plans are fully unlocked during your trial. Cancel any time — no lock-in contracts.</p>
          </div>
        </div>

        {/* Current Plan Banner */}
        <div className={`rounded-2xl border ${currentPlanDetails.borderColor} ${currentPlanDetails.bgColor} p-5 mb-6`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Current plan</span>
                <Badge variant="outline" className={`${currentPlanDetails.color} border-current`}>
                  {currentPlanDetails.name}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30">Beta — Free</Badge>
              </div>
              <p className="font-semibold text-foreground">
                {currentPlan === "free"
                  ? "You're on the Free plan — 3 scans per month"
                  : `${currentPlanDetails.name} — Free during beta (normally $${currentPlanDetails.monthlyPrice} AUD/mo)`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Paid billing begins after 30 May 2026</p>
            </div>
            {currentPlan !== "free" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="flex items-center gap-2"
              >
                {portalLoading ? "Opening..." : "Manage Billing"}
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Available Plans</h2>
          <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${billing === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${billing === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Annual <span className="text-xs bg-emerald-500/20 text-emerald-500 px-1.5 py-0.5 rounded-full">-17%</span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {(["starter", "growth", "agency"] as PlanKey[]).map((planKey) => {
            const plan = PLAN_DETAILS[planKey];
            const planIndex = planOrder.indexOf(planKey);
            const isCurrent = currentPlan === planKey;
            const isDowngrade = planIndex < currentPlanIndex;
            const Icon = plan.icon;
            const monthlyEq = getMonthlyEquiv(plan);

            return (
              <div
                key={planKey}
                className={`rounded-2xl border p-6 flex flex-col ${
                  planKey === "growth"
                    ? "border-violet-500/40 bg-card shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/20"
                    : "border-border bg-card"
                }`}
              >
                {planKey === "growth" && (
                  <div className="text-xs font-bold text-violet-400 bg-violet-500/10 rounded-full px-3 py-1 w-fit mb-3">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  {Icon && <Icon className={`w-4 h-4 ${plan.color}`} />}
                  <span className={`font-semibold ${plan.color}`}>{plan.name}</span>
                </div>
                <div className="mb-1">
                  {billing === "annual" ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold tracking-tight">${monthlyEq}</span>
                        <span className="text-sm font-normal text-muted-foreground">AUD/mo</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Billed annually — <span className="line-through">${plan.monthlyPrice * 12}</span>{" "}
                        <span className="text-emerald-500 font-medium">${plan.annualPrice} AUD/yr</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold tracking-tight">${plan.monthlyPrice}</span>
                        <span className="text-sm font-normal text-muted-foreground">AUD/mo</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Billed monthly · Cancel anytime</div>
                    </>
                  )}
                </div>

                <div className="space-y-2 my-5 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    <Check className="w-4 h-4 mr-2" /> Current Plan
                  </Button>
                ) : isDowngrade ? (
                  <Button variant="outline" className="w-full text-muted-foreground" disabled>
                    Downgrade
                  </Button>
                ) : (
                  <Button
                    className={`w-full text-white border-0 hover:opacity-90 ${
                      planKey === "growth"
                        ? "bg-gradient-to-r from-violet-600 to-purple-500"
                        : planKey === "agency"
                        ? "bg-gradient-to-r from-orange-500 to-rose-500"
                        : "bg-gradient-to-r from-blue-600 to-cyan-500"
                    }`}
                    onClick={() => handleUpgrade(planKey)}
                    disabled={loadingPlan === planKey}
                  >
                    {loadingPlan === planKey ? "Redirecting..." : "Upgrade"}
                    {loadingPlan !== planKey && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Test card info */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm mb-4">
          <p className="font-medium text-foreground mb-1">Testing payments</p>
          <p className="text-muted-foreground">
            Use test card <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">4242 4242 4242 4242</code> with any future expiry and any CVC to test checkout.
          </p>
        </div>

        {/* Contact */}
        <p className="text-xs text-muted-foreground text-center">
          Questions about billing?{" "}
          <a href="/contact" className="text-violet-400 hover:underline">Contact us</a> or email hello@blastly.ai
        </p>
      </div>
    </AppLayout>
  );
}
