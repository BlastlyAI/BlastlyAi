import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Compose from "./pages/Compose";
import CalendarPage from "./pages/CalendarPage";
import Campaigns from "./pages/Campaigns";
import Analytics from "./pages/Analytics";
import Connections from "./pages/Connections";
import Library from "./pages/Library";
import Team from "./pages/Team";
import Notifications from "./pages/Notifications";
import AdStudio from "./pages/AdStudio";
// Agentic AI pages
import AgentPage from "./pages/AgentPage";
import IntelligencePage from "./pages/IntelligencePage";
import BrandVoicePage from "./pages/BrandVoicePage";
import TrendsPage from "./pages/TrendsPage";
import FactoryPage from "./pages/FactoryPage";
import ROIBrainPage from "./pages/ROIBrainPage";
import VideoStudio from "./pages/VideoStudio";
// Public Audit Tool
import AuditPage from "./pages/AuditPage";
import AuditReportPage from "./pages/AuditReportPage";
import AuditHistoryPage from "./pages/AuditHistoryPage";
// Onboarding
import Onboarding from "./pages/Onboarding";
import OnboardingComplete from "./pages/OnboardingComplete";
import ManagedOnboarding from "./pages/ManagedOnboarding";
// Public pages
import Pricing from "./pages/Pricing";
import PaymentSuccess from "./pages/PaymentSuccess";
import SharedReport from "./pages/SharedReport";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import BillingPage from "./pages/BillingPage";
import AppsPage from "./pages/AppsPage";
import SeoHealth from "./pages/SeoHealth";
import DigitalPresence from "./pages/DigitalPresence";
import CompetitorIntelligence from "./pages/CompetitorIntelligence";
import DashboardSettings from "./pages/DashboardSettings";
import BrandProfile from "./pages/BrandProfile";
import AdminDashboard from "./pages/AdminDashboard";
import ConnectedApps from "./pages/ConnectedApps";
import AppHealth from "./pages/AppHealth";
// Approval system
import ApprovalQueue from "./pages/ApprovalQueue";
import BrandBrief from "./pages/BrandBrief";
import ClientPreview from "./pages/ClientPreview";
// Quick Capture
import QuickCapture from "./pages/QuickCapture";
import PostQueue from "./pages/PostQueue";
import ReminderSettings from "./pages/ReminderSettings";
// Instant Ad Demo
import InstantAdDemo from "./pages/InstantAdDemo";
// PWA Install Guide
import InstallGuide from "./pages/InstallGuide";
// Snap to Post demo
// Social Setup 3-step guide
import SocialSetupWrapper from "./pages/SocialSetupWrapper";
// Business AI Intelligence Feed
import IntelligenceFeed from "./pages/IntelligenceFeed";
// Command Centre — AI-gatekeeper daily command screen (default after login)
import CommandCentreBI from "./pages/CommandCentreBI";
// Quick Setup — rapid-fire approve flow for connections
import QuickSetup from "./pages/QuickSetup";
// Beta Test Checklist
import BetaTestChecklist from "./pages/BetaTestChecklist";
// Contacts & SMS Campaigns
import ContactsPage from "./pages/Contacts";
import SmsCampaignsPage from "./pages/SmsCampaigns";
// Appointments & Booking
import AppointmentsPage from "./pages/AppointmentsPage";
import ServiceMenuPage from "./pages/ServiceMenuPage";
import BookingPortalPage from "./pages/BookingPortalPage";
import LoyaltySettingsPage from "./pages/LoyaltySettingsPage";
import PremiumDashboardHome from "./pages/PremiumDashboardHome";
import UpgradePage from "./pages/UpgradePage";
import UpgradeSuccessPage from "./pages/UpgradeSuccessPage";
import { PaidCommandCentreGuard, FreeDashboardGuard } from "./components/PlanRouteGuard";
// Intelligence Report
import IntelligenceReportPage from "./pages/IntelligenceReportPage";
// Beta
import BetaBanner from "./components/BetaBanner";
import FeedbackButton from "./components/FeedbackButton";
// Custom auth screens
import { AuthEntry, AuthSignup, AuthLogin, AuthForgotPassword, AuthResetPassword, AuthWelcome } from "./pages/AuthPages";


function GuardedPremiumHome() {
  return (
    <FreeDashboardGuard>
      <PremiumDashboardHome />
    </FreeDashboardGuard>
  );
}

function GuardedCommandCentre() {
  return (
    <PaidCommandCentreGuard>
      <CommandCentreBI />
    </PaidCommandCentreGuard>
  );
}

function Router() {
  return (
    <Switch>
      {/* Custom auth routes */}
      <Route path="/auth" component={AuthEntry} />
      <Route path="/signup" component={AuthSignup} />
      <Route path="/login" component={AuthLogin} />
      <Route path="/forgot-password" component={AuthForgotPassword} />
      <Route path="/reset-password" component={AuthResetPassword} />
      <Route path="/welcome" component={AuthWelcome} />
      <Route path="/settings/channels">{() => <Redirect to="/dashboard/connections" />}</Route>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/audit" component={AuditPage} />
      <Route path="/audit/report/:token" component={AuditReportPage} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/report/:token" component={SharedReport} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/contact" component={Contact} />
      <Route path="/apps" component={AppsPage} />
      <Route path="/snap-demo"><Redirect to="/" /></Route>
      {/* Onboarding */}
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/onboarding/complete" component={OnboardingComplete} />
      <Route path="/onboarding/managed" component={ManagedOnboarding} />

      <Route path="/upgrade" component={UpgradePage} />
      <Route path="/upgrade/success" component={UpgradeSuccessPage} />

      {/* Command Centre — paid only */}
      <Route path="/command-centre" component={GuardedCommandCentre} />
      <Route path="/command" component={GuardedCommandCentre} />
      {/* Quick Setup — rapid-fire approve flow for connections */}
      <Route path="/quick-setup" component={QuickSetup} />
      {/* Legacy redirects */}
      <Route path="/intelligence">{() => { if (typeof window !== "undefined") window.location.replace("/command-centre"); return null; }}</Route>
      <Route path="/field">{() => { if (typeof window !== "undefined") window.location.replace("/command-centre"); return null; }}</Route>
      {/* Contacts & SMS Campaigns */}
      <Route path="/contacts" component={ContactsPage} />
      <Route path="/sms-campaigns" component={SmsCampaignsPage} />
      {/* Appointments & Booking */}
      <Route path="/dashboard/appointments" component={AppointmentsPage} />
      <Route path="/dashboard/service-menu" component={ServiceMenuPage} />
      <Route path="/dashboard/loyalty" component={LoyaltySettingsPage} />
      {/* Public booking portal — no login required */}
      <Route path="/book/:slug" component={BookingPortalPage} />

      <Route path="/dashboard/home" component={GuardedPremiumHome} />
      {/* Business AI Intelligence Feed (full version) */}
      <Route path="/dashboard/live-feed" component={IntelligenceFeed} />

      {/* Dashboard routes — /dashboard redirects to Command Centre by default */}
      <Route path="/dashboard">{() => <Redirect to="/dashboard/home" />}</Route>
      <Route path="/dashboard/overview" component={Dashboard} />
      <Route path="/dashboard/compose" component={Compose} />
      <Route path="/dashboard/calendar" component={CalendarPage} />
      <Route path="/dashboard/campaigns" component={Campaigns} />
      <Route path="/dashboard/analytics" component={Analytics} />
      <Route path="/dashboard/connections" component={Connections} />
      <Route path="/dashboard/library" component={Library} />
      <Route path="/dashboard/team" component={Team} />
      <Route path="/dashboard/settings" component={DashboardSettings} />
      <Route path="/dashboard/notifications" component={Notifications} />
      <Route path="/dashboard/ad-studio" component={AdStudio} />

      {/* Agentic AI routes */}
      <Route path="/dashboard/agent" component={AgentPage} />
      <Route path="/dashboard/intelligence" component={IntelligencePage} />
      <Route path="/dashboard/intelligence-report" component={IntelligenceReportPage} />
      <Route path="/dashboard/brand-voice" component={BrandVoicePage} />
      <Route path="/dashboard/trends" component={TrendsPage} />
      <Route path="/dashboard/factory" component={FactoryPage} />
      <Route path="/dashboard/roi-brain" component={ROIBrainPage} />
      <Route path="/dashboard/audit-history" component={AuditHistoryPage} />
      <Route path="/dashboard/video-studio" component={VideoStudio} />
      <Route path="/dashboard/billing" component={BillingPage} />
      <Route path="/dashboard/seo-health" component={SeoHealth} />
      <Route path="/dashboard/digital-presence" component={DigitalPresence} />
      <Route path="/dashboard/competitor-intelligence" component={CompetitorIntelligence} />
      <Route path="/dashboard/brand-profile" component={BrandProfile} />
      <Route path="/dashboard/connected-apps" component={ConnectedApps} />
      <Route path="/dashboard/app-health" component={AppHealth} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/dashboard/approval-queue" component={ApprovalQueue} />
      <Route path="/dashboard/brand-brief" component={BrandBrief} />
      {/* Public client preview — no login required */}
      <Route path="/preview/:token" component={ClientPreview} />
      {/* Quick Capture — mobile-first content submission */}
      <Route path="/dashboard/quick-capture" component={QuickCapture} />
      {/* Post Queue — client-facing content queue */}
      <Route path="/dashboard/queue" component={PostQueue} />
      <Route path="/dashboard/reminders" component={ReminderSettings} />
      {/* Instant Ad Demo — public, no login */}
      <Route path="/ad-demo/:token" component={InstantAdDemo} />
      {/* Social Setup 3-step guide */}
      <Route path="/social-setup" component={SocialSetupWrapper} />
      <Route path="/beta-test" component={BetaTestChecklist} />
      {/* PWA Install Guide — public */}
      <Route path="/install" component={InstallGuide} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Standalone screens that should not show global marketing chrome
const STANDALONE_PATHS = ["/command", "/command-centre", "/upgrade", "/intelligence", "/field", "/contacts", "/sms-campaigns", "/book/", "/auth", "/signup", "/login", "/forgot-password", "/reset-password", "/welcome"];

function AppShell() {
  const [location] = useLocation();
  const isStandalone = STANDALONE_PATHS.some(p => location.startsWith(p));
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <Toaster />
        <Router />
      </div>
      {!isStandalone && <FeedbackButton />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <WorkspaceProvider>
          <TooltipProvider>
            <AppShell />
          </TooltipProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
