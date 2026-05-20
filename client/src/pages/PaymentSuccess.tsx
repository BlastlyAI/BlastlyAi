import { Link } from "wouter";
import { CheckCircle, Zap, ArrowRight, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PLAN_MESSAGES: Record<string, { title: string; subtitle: string; nextSteps: string[] }> = {
  starter: {
    title: "Welcome to Starter!",
    subtitle: "You now have unlimited scans, full PDF reports, and your AI Action Plan is ready.",
    nextSteps: [
      "Run your first unlimited Digital Presence scan",
      "Download your full SEO Health PDF report",
      "Review your 30-day AI Action Plan",
    ],
  },
  growth: {
    title: "Welcome to Growth!",
    subtitle: "Your AI Content Generator and Content Scheduler are now unlocked. Let's grow.",
    nextSteps: [
      "Generate your first AI content batch",
      "Schedule posts across all your platforms",
      "Set up your weekly competitor re-scan alerts",
    ],
  },
  agency: {
    title: "Welcome to Agency!",
    subtitle: "Unlimited workspaces, bulk scanning, and white-label reports are all ready to go.",
    nextSteps: [
      "Create your first client workspace",
      "Run a bulk scan on your client portfolio",
      "Download a white-labelled report for your first client",
    ],
  },
};

export default function PaymentSuccess() {
  const params = new URLSearchParams(window.location.search);
  const plan = params.get("plan") || "starter";
  const billing = params.get("billing") || "monthly";
  const auditToken = params.get("auditToken") || params.get("audit_token") || "";
  // If we have an audit token, go straight to onboarding with data pre-filled
  // Otherwise go to Command Centre (the day-to-day screen)
  const ctaHref = auditToken ? `/onboarding?auditToken=${auditToken}` : "/command";
  const ctaLabel = auditToken ? "Set Up My Account (Pre-filled from Audit)" : "Open Command Centre";

  const message = PLAN_MESSAGES[plan] || PLAN_MESSAGES.starter;

  const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    starter: Globe,
    growth: Zap,
    agency: Users,
  };
  const PlanIcon = planIcons[plan] || Zap;

  const planColors: Record<string, string> = {
    starter: "from-blue-500 to-cyan-500",
    growth: "from-violet-500 to-purple-600",
    agency: "from-orange-500 to-rose-500",
  };
  const planColor = planColors[plan] || "from-violet-500 to-purple-600";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Success Icon */}
        <div className="relative inline-flex mb-6">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${planColor} flex items-center justify-center shadow-lg`}>
            <PlanIcon className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
        </div>

        <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          Payment Successful
        </Badge>

        <h1 className="text-3xl font-bold text-foreground mb-3">{message.title}</h1>
        <p className="text-muted-foreground mb-2">{message.subtitle}</p>
        <p className="text-xs text-muted-foreground mb-8">
          {billing === "annual" ? "Annual plan · billed in AUD" : "Monthly plan · billed in AUD"} · A receipt has been sent to your email.
        </p>

        {/* Next Steps */}
        <div className="bg-card border border-border rounded-2xl p-6 text-left mb-8">
          <h2 className="font-semibold text-foreground mb-4">Your next steps</h2>
          <div className="space-y-3">
            {message.nextSteps.map((step, i) => (
              <div key={step} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${planColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <span className="text-white text-xs font-bold">{i + 1}</span>
                </div>
                <span className="text-sm text-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats reminder */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Scans", value: "Unlimited" },
            { label: "Currency", value: "AUD" },
            { label: "Support", value: "Email" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-3">
              <div className="text-sm font-bold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        <Link href={ctaHref}>
          <Button size="lg" className={`w-full bg-gradient-to-r ${planColor} text-white hover:opacity-90`}>
            {ctaLabel} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>

        <p className="text-xs text-muted-foreground mt-4">
          Need help?{" "}
          <a href="/contact" className="text-violet-400 hover:underline">Contact support</a> or email hello@blastly.ai
        </p>
      </div>
    </div>
  );
}
