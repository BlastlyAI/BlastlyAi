import { Link } from "wouter";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Bell,
  CreditCard,
  Globe,
  Link2,
  Palette,
  Settings,
  User,
} from "lucide-react";

const SECTIONS = [
  {
    title: "Brand profile",
    description: "Business name, logo, tone, and industry",
    href: "/dashboard/brand-profile",
    icon: Palette,
  },
  {
    title: "Social connections",
    description: "Connect Facebook, Instagram, LinkedIn, and more",
    href: "/dashboard/connections",
    icon: Link2,
  },
  {
    title: "Billing & plan",
    description: "Subscription, invoices, and payment methods",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
  {
    title: "Notifications",
    description: "Alerts for posts, campaigns, and team activity",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    title: "Digital presence",
    description: "Website, SEO, and online visibility",
    href: "/dashboard/digital-presence",
    icon: Globe,
  },
];

export default function DashboardSettings() {
  const { user } = useAuth();

  return (
    <AppLayout title="Settings">
      <div className="max-w-3xl mx-auto space-y-8 p-4 md:p-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your workspace, connections, and account preferences.
          </p>
        </div>

        {user && (
          <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <User className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold">{user.name || user.businessName || "Your account"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}

        <div className="grid gap-3">
          {SECTIONS.map(({ title, description, href, icon: Icon }) => (
            <Link key={href} href={href}>
              <div className="glass-card rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/30 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
