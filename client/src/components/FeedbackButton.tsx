import { useState } from "react";
import { MessageSquarePlus, X, Send, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const { user } = useAuth();

  const notify = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      setSent(true);
      setMessage("");
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2500);
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    notify.mutate({
      title: `Beta Feedback${user?.name ? ` from ${user.name}` : ""}`,
      content: `**User:** ${user?.name ?? "Anonymous"} (${user?.email ?? "no email"})\n\n**Feedback:**\n${message}`,
    });
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95"
        style={{
          background: "oklch(0.10 0.016 248)",
          border: "1px solid oklch(0.65 0.28 220 / 0.30)",
          color: "oklch(0.72 0.22 220)",
          boxShadow: "0 0 20px oklch(0.65 0.28 220 / 0.15), 0 4px 16px oklch(0.05 0.010 250 / 0.60)",
          backdropFilter: "blur(12px)",
        }}
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        <span>Feedback</span>
      </button>

      {/* Popover */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-50 w-80 rounded-2xl p-4"
          style={{
            background: "oklch(0.09 0.016 248 / 0.95)",
            border: "1px solid oklch(0.65 0.28 220 / 0.20)",
            boxShadow: "0 0 40px oklch(0.65 0.28 220 / 0.08), 0 20px 60px oklch(0.05 0.010 250 / 0.80)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Top glow line */}
          <div
            className="absolute inset-x-0 top-0 h-px rounded-t-2xl pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, oklch(0.65 0.28 220 / 0.40), transparent)" }}
          />

          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm text-foreground">Send Feedback</p>
              <p className="text-xs" style={{ color: "oklch(0.50 0.014 240)" }}>Found a bug or have a suggestion?</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "oklch(0.45 0.014 240)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.14 0.018 248)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "oklch(0.65 0.24 165 / 0.12)", border: "1px solid oklch(0.65 0.24 165 / 0.25)" }}
              >
                <CheckCircle className="w-6 h-6" style={{ color: "oklch(0.72 0.22 165)" }} />
              </div>
              <p className="text-sm font-medium text-foreground">Thanks for your feedback!</p>
            </div>
          ) : (
            <>
              <textarea
                className="w-full rounded-xl text-sm p-3 resize-none focus:outline-none placeholder:text-muted-foreground text-foreground"
                rows={4}
                placeholder="Describe the bug or suggestion..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{
                  background: "oklch(0.12 0.016 248)",
                  border: "1px solid oklch(0.22 0.018 248)",
                  color: "oklch(0.85 0.012 240)",
                }}
                onFocus={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = "oklch(0.65 0.28 220 / 0.40)"; }}
                onBlur={e => { (e.currentTarget as HTMLTextAreaElement).style.borderColor = "oklch(0.22 0.018 248)"; }}
              />
              <button
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: !message.trim() || notify.isPending
                    ? "oklch(0.14 0.018 248)"
                    : "linear-gradient(135deg, oklch(0.62 0.28 290), oklch(0.65 0.28 220))",
                  color: !message.trim() || notify.isPending ? "oklch(0.40 0.014 240)" : "white",
                  cursor: !message.trim() || notify.isPending ? "not-allowed" : "pointer",
                }}
                onClick={handleSend}
                disabled={!message.trim() || notify.isPending}
              >
                <Send className="w-3.5 h-3.5" />
                {notify.isPending ? "Sending…" : "Send Feedback"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
