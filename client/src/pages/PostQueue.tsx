/**
 * PostQueue — Client-facing post queue management
 *
 * Shows:
 *  - Client's submitted posts (pending review by agency)
 *  - AI backup posts (always-3 queue)
 *  - Quick submit form for new posts
 *  - Queue stats widget
 */
import AppLayout from "@/components/AppLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Clock, CheckCircle2, Sparkles, AlertCircle,
  RefreshCw, Upload, Zap, Shield, Calendar, User,
  ImageIcon, FileText, ChevronRight, Info,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

// ── Helpers ────────────────────────────────────────────────────────────────

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  facebook: "👥",
  tiktok: "🎵",
  linkedin: "💼",
  twitter: "🐦",
  youtube: "▶️",
  google: "🔍",
  pinterest: "📌",
};

function platformIcon(p: string) {
  return PLATFORM_ICONS[p.toLowerCase()] ?? "🌐";
}

function statusBadge(status: string, isUrgent?: boolean) {
  if (isUrgent) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
        style={{ background: "oklch(0.55 0.22 25 / 0.20)", color: "oklch(0.75 0.20 25)", border: "1px solid oklch(0.55 0.22 25 / 0.30)" }}
      >
        <Zap className="w-2.5 h-2.5" /> Urgent
      </span>
    );
  }
  if (status === "pending_review") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
        style={{ background: "oklch(0.55 0.18 60 / 0.20)", color: "oklch(0.75 0.18 60)", border: "1px solid oklch(0.55 0.18 60 / 0.30)" }}
      >
        <Clock className="w-2.5 h-2.5" /> Awaiting review
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
        style={{ background: "oklch(0.55 0.18 145 / 0.20)", color: "oklch(0.72 0.18 145)", border: "1px solid oklch(0.55 0.18 145 / 0.30)" }}
      >
        <CheckCircle2 className="w-2.5 h-2.5" /> Approved
      </span>
    );
  }
  return null;
}

// ── Queue Item Card ────────────────────────────────────────────────────────

interface QueueItem {
  id: number;
  type: "client" | "ai_backup";
  status: string;
  caption: string | null;
  hashtags: string | null;
  mediaUrl: string | null;
  platforms: string[] | null;
  scheduledDate: Date | null;
  isUrgent: boolean | null;
  detectedEventName: string | null;
  detectedPersonName: string | null;
  agencyNote: string | null;
  createdAt: Date | null;
}

function QueueCard({ item, index }: { item: QueueItem; index: number }) {
  const platforms = (item.platforms ?? []) as string[];

  return (
    <div
      className="rounded-xl p-5 transition-all"
      style={{
        background: item.type === "client"
          ? "oklch(0.16 0.015 245 / 0.90)"
          : "oklch(0.15 0.012 200 / 0.80)",
        border: item.type === "client"
          ? "1px solid oklch(0.30 0.015 245 / 0.60)"
          : "1px solid oklch(0.28 0.015 200 / 0.50)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Position badge */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{
            background: item.type === "client"
              ? "oklch(0.52 0.22 145 / 0.20)"
              : "oklch(0.52 0.18 220 / 0.20)",
            color: item.type === "client"
              ? "oklch(0.72 0.22 145)"
              : "oklch(0.65 0.18 220)",
          }}
        >
          {index + 1}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Type badge */}
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{
                background: item.type === "client"
                  ? "oklch(0.52 0.22 145 / 0.15)"
                  : "oklch(0.52 0.18 220 / 0.15)",
                color: item.type === "client"
                  ? "oklch(0.72 0.22 145)"
                  : "oklch(0.65 0.18 220)",
              }}
            >
              {item.type === "client" ? "📤 Your post" : "✨ AI backup"}
            </span>

            {statusBadge(item.status, item.isUrgent ?? false)}

            {item.detectedEventName && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "oklch(0.50 0.18 280 / 0.20)", color: "oklch(0.72 0.18 280)" }}
              >
                🎉 {item.detectedEventName}
              </span>
            )}
          </div>

          {/* Caption */}
          {item.caption && (
            <p
              className="text-sm leading-relaxed mb-2 line-clamp-3"
              style={{ color: "oklch(0.80 0.04 245)" }}
            >
              {item.caption}
            </p>
          )}

          {/* Hashtags */}
          {item.hashtags && (
            <p className="text-xs mb-3" style={{ color: "oklch(0.55 0.04 245)" }}>
              {item.hashtags}
            </p>
          )}

          {/* Media thumbnail */}
          {item.mediaUrl && (
            <div className="mb-3">
              <img
                src={item.mediaUrl}
                alt="Post media"
                className="h-24 w-auto rounded-lg object-cover"
                style={{ border: "1px solid oklch(0.28 0.012 245 / 0.50)" }}
              />
            </div>
          )}

          {/* Footer row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Platforms */}
            {platforms.length > 0 && (
              <div className="flex items-center gap-1">
                {platforms.slice(0, 4).map(p => (
                  <span key={p} title={p} className="text-sm">{platformIcon(p)}</span>
                ))}
                {platforms.length > 4 && (
                  <span className="text-xs" style={{ color: "oklch(0.50 0.04 245)" }}>+{platforms.length - 4}</span>
                )}
              </div>
            )}

            {/* Scheduled date */}
            {item.scheduledDate && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "oklch(0.60 0.04 245)" }}>
                <Calendar className="w-3 h-3" />
                {format(new Date(item.scheduledDate), "d MMM yyyy")}
              </span>
            )}

            {/* Submitted date */}
            {item.createdAt && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "oklch(0.42 0.04 245)" }}>
                <Clock className="w-3 h-3" />
                Submitted {format(new Date(item.createdAt), "d MMM")}
              </span>
            )}
          </div>

          {/* Agency note */}
          {item.agencyNote && (
            <div
              className="mt-3 p-3 rounded-lg text-xs"
              style={{
                background: "oklch(0.18 0.015 245 / 0.60)",
                border: "1px solid oklch(0.32 0.015 245 / 0.40)",
                color: "oklch(0.70 0.04 245)",
              }}
            >
              <span className="font-semibold" style={{ color: "oklch(0.65 0.18 220)" }}>Note from team: </span>
              {item.agencyNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stats Widget ───────────────────────────────────────────────────────────

function QueueStats({ workspaceId }: { workspaceId: number }) {
  const { data, isLoading } = trpc.postQueue.stats.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  const backupTarget = data?.backupTarget ?? 3;
  const backupCount = data?.backupCount ?? 0;
  const backupFill = Math.min(backupCount / backupTarget, 1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Your posts */}
      <div
        className="rounded-xl p-4"
        style={{ background: "oklch(0.16 0.015 245 / 0.90)", border: "1px solid oklch(0.30 0.015 245 / 0.60)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Upload className="w-4 h-4" style={{ color: "oklch(0.72 0.22 145)" }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.04 245)" }}>Your posts</span>
        </div>
        <p className="text-3xl font-extrabold" style={{ color: "oklch(0.72 0.22 145)" }}>{data?.clientCount ?? 0}</p>
        <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.04 245)" }}>awaiting review</p>
      </div>

      {/* AI backup */}
      <div
        className="rounded-xl p-4"
        style={{ background: "oklch(0.15 0.012 200 / 0.80)", border: "1px solid oklch(0.28 0.015 200 / 0.50)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4" style={{ color: "oklch(0.65 0.18 220)" }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.04 245)" }}>AI backup</span>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-extrabold" style={{ color: "oklch(0.65 0.18 220)" }}>{backupCount}</p>
          <p className="text-sm mb-1" style={{ color: "oklch(0.45 0.04 245)" }}>/ {backupTarget}</p>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "oklch(0.22 0.012 245)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${backupFill * 100}%`,
              background: backupFill >= 1
                ? "oklch(0.65 0.22 145)"
                : backupFill >= 0.67
                ? "oklch(0.65 0.18 60)"
                : "oklch(0.65 0.18 25)",
            }}
          />
        </div>
        <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.04 245)" }}>
          {backupFill >= 1 ? "Queue full — you're covered" : `${backupTarget - backupCount} more generating…`}
        </p>
      </div>

      {/* Human review badge */}
      <div
        className="rounded-xl p-4"
        style={{ background: "oklch(0.16 0.012 145 / 0.30)", border: "1px solid oklch(0.35 0.15 145 / 0.30)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4" style={{ color: "oklch(0.72 0.22 145)" }} />
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "oklch(0.55 0.04 245)" }}>Human review</span>
        </div>
        <p className="text-sm font-bold mt-1" style={{ color: "oklch(0.80 0.04 245)" }}>Every post checked</p>
        <p className="text-xs mt-1" style={{ color: "oklch(0.45 0.04 245)" }}>before it goes live</p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PostQueue() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id ?? 0;
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.postQueue.list.useQuery(
    { workspaceId: wsId },
    { enabled: !!wsId }
  );

  const replenishMutation = trpc.postQueue.replenishBackups.useMutation({
    onSuccess: () => {
      toast.success("AI is generating backup posts…");
      setTimeout(() => refetch(), 3000);
    },
    onError: () => toast.error("Failed to generate backup posts"),
  });

  const clientPosts = (data?.clientPosts ?? []) as QueueItem[];
  const backupPosts = (data?.backupPosts ?? []) as QueueItem[];
  const allPosts = [...clientPosts, ...backupPosts];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1
                className="text-2xl font-extrabold tracking-tight"
                style={{ color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Content Queue
              </h1>
              <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.04 245)" }}>
                Your posts, ready to go. We review every one before it goes live.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-1.5"
                style={{ borderColor: "oklch(0.30 0.012 245 / 0.60)", color: "oklch(0.65 0.04 245)" }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", color: "#fff" }}
                asChild
              >
                <Link href="/dashboard/quick-capture">
                  <Camera className="w-3.5 h-3.5" />
                  Add Post
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {wsId > 0 && (
          <div className="mb-8">
            <QueueStats workspaceId={wsId} />
          </div>
        )}

        {/* How it works info banner */}
        <div
          className="rounded-xl p-4 mb-8 flex items-start gap-3"
          style={{
            background: "oklch(0.16 0.015 220 / 0.50)",
            border: "1px solid oklch(0.30 0.015 220 / 0.40)",
          }}
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.18 220)" }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.80 0.04 245)" }}>
              How your queue works
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "oklch(0.55 0.04 245)" }}>
              Your posts always go first. We keep 3 AI backup posts ready so you never go dark — even if you're too busy to upload that week.
              Every post (yours and AI) is reviewed by a human before going live. We recommend 3–5 posts per week, never more than 1 per day.
            </p>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allPosts.length === 0 && (
          <div
            className="rounded-2xl p-12 text-center"
            style={{
              background: "oklch(0.15 0.012 245 / 0.60)",
              border: "1px solid oklch(0.26 0.012 245 / 0.50)",
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "oklch(0.52 0.22 145 / 0.15)" }}
            >
              <Camera className="w-7 h-7" style={{ color: "oklch(0.72 0.22 145)" }} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Queue is empty</h3>
            <p className="text-sm mb-6" style={{ color: "oklch(0.55 0.04 245)" }}>
              Upload your first photo or voice note to get started.
              We'll generate AI backup posts to keep you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="gap-2"
                style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", color: "#fff" }}
                asChild
              >
                <Link href="/dashboard/quick-capture">
                  <Camera className="w-4 h-4" />
                  Upload a post
                </Link>
              </Button>
              {wsId > 0 && (
                <Button
                  variant="outline"
                  className="gap-2"
                  style={{ borderColor: "oklch(0.30 0.012 245 / 0.60)", color: "oklch(0.65 0.04 245)" }}
                  onClick={() => replenishMutation.mutate({ workspaceId: wsId })}
                  disabled={replenishMutation.isPending}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate AI backups
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Client posts section */}
        {!isLoading && clientPosts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-4 h-4" style={{ color: "oklch(0.72 0.22 145)" }} />
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "oklch(0.72 0.22 145)" }}>
                Your Posts — {clientPosts.length} queued
              </h2>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "oklch(0.52 0.22 145 / 0.15)", color: "oklch(0.72 0.22 145)" }}
              >
                Priority
              </span>
            </div>
            <div className="space-y-4">
              {clientPosts.map((item, i) => (
                <QueueCard key={item.id} item={item} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* AI backup section */}
        {!isLoading && backupPosts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "oklch(0.65 0.18 220)" }} />
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "oklch(0.65 0.18 220)" }}>
                  AI Backup Posts — {backupPosts.length} ready
                </h2>
              </div>
              {wsId > 0 && backupPosts.length < 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  style={{ color: "oklch(0.65 0.18 220)" }}
                  onClick={() => replenishMutation.mutate({ workspaceId: wsId })}
                  disabled={replenishMutation.isPending}
                >
                  <RefreshCw className="w-3 h-3" />
                  Top up to 3
                </Button>
              )}
            </div>
            <div
              className="rounded-xl p-3 mb-4 text-xs flex items-start gap-2"
              style={{
                background: "oklch(0.15 0.012 200 / 0.40)",
                border: "1px solid oklch(0.28 0.015 200 / 0.40)",
                color: "oklch(0.55 0.04 245)",
              }}
            >
              <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.18 220)" }} />
              These posts were written by AI based on your brand profile. They go live only if you haven't uploaded your own content that week.
              A human reviews every one before publishing.
            </div>
            <div className="space-y-4">
              {backupPosts.map((item, i) => (
                <QueueCard key={item.id} item={item} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* CTA — add more content */}
        {!isLoading && allPosts.length > 0 && (
          <div
            className="rounded-xl p-5 flex items-center justify-between"
            style={{
              background: "oklch(0.16 0.015 145 / 0.30)",
              border: "1px solid oklch(0.35 0.15 145 / 0.30)",
            }}
          >
            <div>
              <p className="text-sm font-bold text-white">Got a moment?</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.04 245)" }}>
                Upload a photo + voice note — takes under 60 seconds.
              </p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, oklch(0.52 0.22 145), oklch(0.46 0.20 200))", color: "#fff" }}
              asChild
            >
              <Link href="/dashboard/quick-capture">
                <Camera className="w-3.5 h-3.5" />
                Quick Upload
              </Link>
            </Button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
