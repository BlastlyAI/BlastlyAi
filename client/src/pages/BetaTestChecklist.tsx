import { useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, AlertTriangle, ArrowLeft, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type StepStatus = "pass" | "fail" | "skip" | "pending";

interface TestStep {
  id: string;
  label: string;
  detail?: string;
  status: StepStatus;
  note: string;
}

interface TestSection {
  id: string;
  title: string;
  emoji: string;
  priority: "critical" | "high" | "medium";
  steps: TestStep[];
  expanded: boolean;
}

const INITIAL_SECTIONS: TestSection[] = [
  {
    id: "onboarding",
    title: "Onboarding & Quick Setup",
    emoji: "🚀",
    priority: "critical",
    expanded: true,
    steps: [
      { id: "o1", label: "Sign up / log in with Manus OAuth", detail: "Should redirect to Command Centre after login", status: "pending", note: "" },
      { id: "o2", label: "Quick Setup page loads at /quick-setup", detail: "12 connection cards visible, privacy banner at top", status: "pending", note: "" },
      { id: "o3", label: "Approve Google Contacts connection", detail: "Card turns blue/connected, counter increments", status: "pending", note: "" },
      { id: "o4", label: "Approve Google Calendar connection", detail: "Card turns connected, Disconnect button appears", status: "pending", note: "" },
      { id: "o5", label: "Approve SMS Notifications", detail: "Card shows connected state", status: "pending", note: "" },
      { id: "o6", label: "Facebook card shows orange warning note", detail: "Warning: Facebook Ads unavailable, use Google/TikTok", status: "pending", note: "" },
      { id: "o7", label: "Disconnect any connection and re-approve", detail: "Toggle works correctly both ways", status: "pending", note: "" },
      { id: "o8", label: "Tap Done → redirects to Command Centre", detail: "Progress bar shows approved count", status: "pending", note: "" },
    ],
  },
  {
    id: "command_centre",
    title: "Command Centre — Daily View",
    emoji: "🎯",
    priority: "critical",
    expanded: false,
    steps: [
      { id: "cc1", label: "Command Centre loads without scrolling", detail: "All content visible on one screen — no vertical scroll needed", status: "pending", note: "" },
      { id: "cc2", label: "Urgent cards pinned at top (3–4 visible)", detail: "Red dot, APPT/LEAD/SMS badges visible", status: "pending", note: "" },
      { id: "cc3", label: "AWARENESS divider line visible below urgent cards", detail: "Thin line separating sections", status: "pending", note: "" },
      { id: "cc4", label: "Awareness ticker shows 1 rotating card", detail: "Rotates every 20 seconds automatically", status: "pending", note: "" },
      { id: "cc5", label: "Today at a Glance panel fills remaining space", detail: "Shows appointment count, available slots, revenue, next appt", status: "pending", note: "" },
      { id: "cc6", label: "Today's Schedule visible on right column", detail: "Available slots show green Available badge", status: "pending", note: "" },
      { id: "cc7", label: "Invoices & Payments panel visible on right", detail: "Shows today's total and New Invoice button", status: "pending", note: "" },
      { id: "cc8", label: "2 action buttons at bottom: Client Contact + Quick Post", detail: "No Email or SMS Blast buttons", status: "pending", note: "" },
      { id: "cc9", label: "Header shows logo, date (bright), dark/light toggle", detail: "No AI greeting badge in top right", status: "pending", note: "" },
    ],
  },
  {
    id: "reply_flow",
    title: "Message Reply Flow",
    emoji: "💬",
    priority: "critical",
    expanded: false,
    steps: [
      { id: "rf1", label: "Tap an urgent card — reply panel opens on right", detail: "Client info on left, reply area on right", status: "pending", note: "" },
      { id: "rf2", label: "Channel selector shows SMS / Email / Social", detail: "3 buttons appear above the reply box", status: "pending", note: "" },
      { id: "rf3", label: "Select SMS channel — text box ready", detail: "Quick reply chips visible", status: "pending", note: "" },
      { id: "rf4", label: "Mic/voice button visible (purple)", detail: "Hold to speak, text fills reply box", status: "pending", note: "" },
      { id: "rf5", label: "Swipe left on card reveals action buttons", detail: "Reply and Done/Archive buttons appear", status: "pending", note: "" },
      { id: "rf6", label: "Tap Done — card moves out of urgent", detail: "Card removed or marked resolved", status: "pending", note: "" },
    ],
  },
  {
    id: "appointments",
    title: "Appointments & Job Flow",
    emoji: "📅",
    priority: "critical",
    expanded: false,
    steps: [
      { id: "ap1", label: "Click a booked slot in Today's Schedule", detail: "Appointment Drawer slides in from right", status: "pending", note: "" },
      { id: "ap2", label: "Drawer shows client name, phone, email, address", detail: "All details from booking visible", status: "pending", note: "" },
      { id: "ap3", label: "SMS Flow tab — 4 buttons: Confirm / On My Way / Reminder / Thank You", detail: "Each has a Send button", status: "pending", note: "" },
      { id: "ap4", label: "Send Confirmation SMS — button turns sent/grey", detail: "Cannot send twice", status: "pending", note: "" },
      { id: "ap5", label: "Job Notes tab — text area for what was done", detail: "Amount field below notes", status: "pending", note: "" },
      { id: "ap6", label: "Invoice tab — Cash / Card / Online payment method", detail: "Invoice reference auto-generated", status: "pending", note: "" },
      { id: "ap7", label: "Mark Complete & Send Thank You button", detail: "Fires thank-you SMS, queues Google review 3 days later", status: "pending", note: "" },
      { id: "ap8", label: "Available slots show green Available + Book badge", detail: "Clicking opens new booking form", status: "pending", note: "" },
    ],
  },
  {
    id: "contacts",
    title: "Client Contact & Contacts",
    emoji: "👥",
    priority: "high",
    expanded: false,
    steps: [
      { id: "co1", label: "Tap Client Contact button — modal opens", detail: "3 tabs: My Contacts, Google, Upload File", status: "pending", note: "" },
      { id: "co2", label: "My Contacts tab — list of existing contacts", detail: "Search by name, phone, email works", status: "pending", note: "" },
      { id: "co3", label: "Google tab — Connect Google Contacts button", detail: "Privacy note visible: no data stored on servers", status: "pending", note: "" },
      { id: "co4", label: "Upload File tab — drag and drop CSV/vCard", detail: "Accepts .csv and .vcf files", status: "pending", note: "" },
      { id: "co5", label: "Select a contact → channel picker appears", detail: "SMS / Email / Social options", status: "pending", note: "" },
    ],
  },
  {
    id: "posts",
    title: "Smart Post System",
    emoji: "📱",
    priority: "high",
    expanded: false,
    steps: [
      { id: "sp1", label: "Post reminder card appears in Awareness section", detail: "Shows '📅 Post ready for tomorrow — we've drafted it'", status: "pending", note: "" },
      { id: "sp2", label: "Tap card — pre-drafted post content visible", detail: "AI-written draft based on business profile", status: "pending", note: "" },
      { id: "sp3", label: "Proceed button publishes the draft", detail: "Post sent to connected platforms", status: "pending", note: "" },
      { id: "sp4", label: "Make My Own button — camera + voice opens", detail: "Photo capture and voice-to-text available", status: "pending", note: "" },
      { id: "sp5", label: "Ignored post escalates to Urgent section", detail: "Moves from awareness to pinned urgent when overdue", status: "pending", note: "" },
      { id: "sp6", label: "Quick Post button opens post composer", detail: "Platform selector, text area, publish button", status: "pending", note: "" },
    ],
  },
  {
    id: "ad_studio",
    title: "Ad Studio",
    emoji: "🎨",
    priority: "high",
    expanded: false,
    steps: [
      { id: "as1", label: "Ad Studio loads at /dashboard/ad-studio", detail: "Business info form on left, output on right", status: "pending", note: "" },
      { id: "as2", label: "Google Ads and TikTok Ads show TOP badge", detail: "Selected by default", status: "pending", note: "" },
      { id: "as3", label: "Facebook Ads shows N/A badge and is greyed out", detail: "Cannot be selected, tooltip explains why", status: "pending", note: "" },
      { id: "as4", label: "Fill in business details and generate ad", detail: "AI generates copy for each selected platform", status: "pending", note: "" },
      { id: "as5", label: "Copy button works for each platform's ad copy", detail: "Toast confirms copy to clipboard", status: "pending", note: "" },
      { id: "as6", label: "Save campaign saves to library", detail: "Appears in saved campaigns list", status: "pending", note: "" },
    ],
  },
  {
    id: "billing",
    title: "Billing & Payments",
    emoji: "💳",
    priority: "medium",
    expanded: false,
    steps: [
      { id: "bi1", label: "Pricing page shows plan tiers", detail: "Free, Fix My Brand, Managed Social", status: "pending", note: "" },
      { id: "bi2", label: "Upgrade button opens Stripe checkout", detail: "Opens in new tab, pre-filled with user email", status: "pending", note: "" },
      { id: "bi3", label: "Test payment with card 4242 4242 4242 4242", detail: "Payment succeeds, plan upgrades", status: "pending", note: "" },
      { id: "bi4", label: "Billing page shows current plan and invoices", detail: "Stripe subscription status visible", status: "pending", note: "" },
    ],
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  high: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  medium: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

export default function BetaTestChecklist() {
  const [, navigate] = useLocation();
  const [sections, setSections] = useState<TestSection[]>(INITIAL_SECTIONS);
  const [testerName, setTesterName] = useState("");

  const totalSteps = sections.flatMap(s => s.steps).length;
  const passCount = sections.flatMap(s => s.steps).filter(s => s.status === "pass").length;
  const failCount = sections.flatMap(s => s.steps).filter(s => s.status === "fail").length;
  const progress = Math.round((passCount / totalSteps) * 100);

  const updateStep = (sectionId: string, stepId: string, field: "status" | "note", value: string) => {
    setSections(prev => prev.map(sec =>
      sec.id === sectionId
        ? { ...sec, steps: sec.steps.map(st => st.id === stepId ? { ...st, [field]: value } : st) }
        : sec
    ));
  };

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(sec =>
      sec.id === sectionId ? { ...sec, expanded: !sec.expanded } : sec
    ));
  };

  const resetAll = () => {
    setSections(INITIAL_SECTIONS.map(s => ({
      ...s,
      steps: s.steps.map(st => ({ ...st, status: "pending" as StepStatus, note: "" })),
    })));
  };

  const exportReport = () => {
    const lines: string[] = [
      `BLASTLY BETA TEST REPORT`,
      `Tester: ${testerName || "Anonymous"}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Progress: ${passCount}/${totalSteps} passed (${progress}%)`,
      `Failures: ${failCount}`,
      ``,
    ];
    sections.forEach(sec => {
      lines.push(`## ${sec.emoji} ${sec.title}`);
      sec.steps.forEach(st => {
        const icon = st.status === "pass" ? "✅" : st.status === "fail" ? "❌" : st.status === "skip" ? "⏭️" : "⬜";
        lines.push(`  ${icon} ${st.label}`);
        if (st.note) lines.push(`     Note: ${st.note}`);
      });
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blastly-beta-test-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0d14]/95 backdrop-blur border-b border-white/5 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/command")} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold">Beta Test Checklist</h1>
              <p className="text-xs text-slate-500">End-to-end journey — tick as you go</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all">
              <RotateCcw className="w-3 h-3" />Reset
            </button>
            <button onClick={exportReport} className="flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 transition-all">
              <Download className="w-3 h-3" />Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Progress bar */}
        <div className="bg-[#111827] rounded-2xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">Overall Progress</p>
              <p className="text-xs text-slate-500 mt-0.5">{passCount} passed · {failCount} failed · {totalSteps - passCount - failCount} remaining</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-violet-400">{progress}%</p>
              <input
                className="text-xs bg-transparent border-b border-white/10 text-slate-400 outline-none text-right mt-1"
                placeholder="Your name..."
                value={testerName}
                onChange={e => setTesterName(e.target.value)}
              />
            </div>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #7c3aed, #3b82f6)" }}
            />
          </div>
          {failCount > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              {failCount} issue{failCount !== 1 ? "s" : ""} need attention before launch
            </div>
          )}
        </div>

        {/* Sections */}
        {sections.map(section => {
          const sectionPass = section.steps.filter(s => s.status === "pass").length;
          const sectionFail = section.steps.filter(s => s.status === "fail").length;
          const allDone = sectionPass === section.steps.length;

          return (
            <div key={section.id} className="bg-[#111827] rounded-2xl border border-white/5 overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{section.emoji}</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{section.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{sectionPass}/{section.steps.length} steps complete</p>
                  </div>
                  <Badge className={`text-[10px] border ${PRIORITY_COLORS[section.priority]}`}>
                    {section.priority}
                  </Badge>
                  {allDone && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">✓ DONE</span>}
                  {sectionFail > 0 && <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">{sectionFail} FAIL</span>}
                </div>
                {section.expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              </button>

              {/* Steps */}
              {section.expanded && (
                <div className="border-t border-white/5 divide-y divide-white/3">
                  {section.steps.map(step => (
                    <div key={step.id} className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        {/* Status toggle */}
                        <div className="flex gap-1 mt-0.5 flex-shrink-0">
                          {(["pass", "fail", "skip"] as StepStatus[]).map(s => (
                            <button
                              key={s}
                              onClick={() => updateStep(section.id, step.id, "status", step.status === s ? "pending" : s)}
                              className={`w-6 h-6 rounded-md text-[9px] font-bold border transition-all ${
                                step.status === s
                                  ? s === "pass" ? "bg-emerald-500 border-emerald-500 text-white"
                                    : s === "fail" ? "bg-red-500 border-red-500 text-white"
                                    : "bg-slate-500 border-slate-500 text-white"
                                  : "border-white/10 text-slate-600 hover:border-white/20"
                              }`}
                            >
                              {s === "pass" ? "✓" : s === "fail" ? "✗" : "—"}
                            </button>
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${step.status === "pass" ? "text-emerald-400" : step.status === "fail" ? "text-red-400" : "text-slate-200"}`}>
                            {step.label}
                          </p>
                          {step.detail && <p className="text-[11px] text-slate-500 mt-0.5">{step.detail}</p>}
                          {(step.status === "fail" || step.note) && (
                            <Textarea
                              placeholder="Add a note about this issue..."
                              value={step.note}
                              onChange={e => updateStep(section.id, step.id, "note", e.target.value)}
                              className="mt-2 text-xs bg-white/5 border-white/10 text-slate-300 placeholder:text-slate-600 resize-none h-16 rounded-lg"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Footer note */}
        <div className="text-center text-xs text-slate-600 pb-6">
          Run through each section in order. Mark ✓ pass, ✗ fail, or — skip. Add notes on failures. Export report when done.
        </div>
      </div>
    </div>
  );
}
