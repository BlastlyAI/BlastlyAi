import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2, XCircle, Edit3, Flag, Send, Loader2,
  Clock, Users, AlertTriangle, Copy, ExternalLink, RefreshCw,
  Camera, Mic, Image as ImageIcon, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

// ── Post types ────────────────────────────────────────────────────────────────
type Post = {
  id: number;
  workspaceId: number;
  workspaceName: string;
  title: string | null;
  bodyText: string | null;
  mediaUrls: unknown;
  hashtags: unknown;
  approvalStatus: string;
  agencyNote: string | null;
  clientNote: string | null;
  previewToken: string | null;
  scheduledAt: Date | null;
  createdAt: Date;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_agency: { label: "Needs your review", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  pending_client: { label: "Awaiting client",   color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  approved:       { label: "Approved",           color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  rejected:       { label: "Rejected",           color: "bg-red-500/20 text-red-300 border-red-500/30" },
};

function PostRow({ post, onAction }: { post: Post; onAction: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(post.bodyText ?? "");
  const [agencyNote, setAgencyNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const approveMutation = trpc.approval.approvePost.useMutation({
    onSuccess: (data) => {
      toast.success(data.status === "pending_client" ? "Sent to client for review" : "Post approved");
      onAction();
    },
  });
  const editApproveMutation = trpc.approval.editAndApprove.useMutation({
    onSuccess: (data) => {
      toast.success(data.status === "pending_client" ? "Edited and sent to client" : "Edited and approved");
      setEditing(false); onAction();
    },
  });
  const rejectMutation = trpc.approval.rejectPost.useMutation({
    onSuccess: () => { toast.success("Post rejected — sent back to draft"); setRejecting(false); onAction(); },
  });

  const hashtags = Array.isArray(post.hashtags) ? post.hashtags as string[] : [];
  const cfg = STATUS_CONFIG[post.approvalStatus] ?? { label: post.approvalStatus, color: "bg-white/10 text-white/50 border-white/20" };

  const copyPreviewLink = () => {
    if (!post.previewToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/preview/${post.previewToken}`);
    toast.success("Preview link copied");
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
              <span className="text-xs text-white/40 flex items-center gap-1"><Users className="w-3 h-3" />{post.workspaceName}</span>
              {post.scheduledAt && (
                <span className="text-xs text-white/40 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(post.scheduledAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            {post.title && <p className="font-semibold text-white text-sm truncate">{post.title}</p>}
          </div>
        </div>
        {post.clientNote && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
            <Flag className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300 mb-0.5">Client flagged this post</p>
              <p className="text-xs text-amber-200/80">"{post.clientNote}"</p>
            </div>
          </div>
        )}
        {editing ? (
          <div className="space-y-2">
            <Textarea value={editedBody} onChange={(e) => setEditedBody(e.target.value)} className="bg-white/5 border-white/20 text-white text-sm min-h-[100px]" />
            <Input value={agencyNote} onChange={(e) => setAgencyNote(e.target.value)} placeholder="Note about your edit (optional)" className="bg-white/5 border-white/20 text-white text-sm placeholder:text-white/30" />
          </div>
        ) : (
          post.bodyText && <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap line-clamp-4">{post.bodyText}</p>
        )}
        {hashtags.length > 0 && !editing && (
          <div className="flex flex-wrap gap-1">
            {hashtags.map((tag) => (
              <span key={tag} className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">#{tag.replace(/^#/, "")}</span>
            ))}
          </div>
        )}
        {rejecting && (
          <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Reason for rejection (required)" className="bg-white/5 border-red-500/30 text-white text-sm min-h-[80px]" />
        )}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
          {editing ? (
            <>
              <Button size="sm" onClick={() => editApproveMutation.mutate({ postId: post.id, bodyText: editedBody, agencyNote, sendToClient: true })} disabled={editApproveMutation.isPending} className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5">
                {editApproveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Save & send to client
              </Button>
              <Button size="sm" onClick={() => editApproveMutation.mutate({ postId: post.id, bodyText: editedBody, agencyNote, sendToClient: false })} disabled={editApproveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Save & approve
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-white/40 text-xs">Cancel</Button>
            </>
          ) : rejecting ? (
            <>
              <Button size="sm" onClick={() => rejectMutation.mutate({ postId: post.id, agencyNote: rejectNote })} disabled={!rejectNote.trim() || rejectMutation.isPending} className="bg-red-600 hover:bg-red-500 text-white text-xs gap-1.5">
                {rejectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Confirm reject
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRejecting(false)} className="text-white/40 text-xs">Cancel</Button>
            </>
          ) : (
            <>
              {post.approvalStatus === "pending_agency" && (
                <>
                  <Button size="sm" onClick={() => approveMutation.mutate({ postId: post.id, sendToClient: true })} disabled={approveMutation.isPending} className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5">
                    {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send to client
                  </Button>
                  <Button size="sm" onClick={() => approveMutation.mutate({ postId: post.id, sendToClient: false })} disabled={approveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="border-white/20 text-white/60 hover:text-white text-xs gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRejecting(true)} className="text-red-400/70 hover:text-red-400 text-xs gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </Button>
                </>
              )}
              {post.approvalStatus === "pending_client" && post.previewToken && (
                <Button size="sm" variant="outline" onClick={copyPreviewLink} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> Copy client preview link
                </Button>
              )}
              {post.previewToken && (
                <Button size="sm" variant="ghost" onClick={() => window.open(`/preview/${post.previewToken}`, "_blank")} className="text-white/30 hover:text-white/60 text-xs gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Preview
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Quick Capture review card ─────────────────────────────────────────────────
type QuickCapture = {
  id: number;
  workspaceId: number;
  mediaUrl: string | null;
  mediaType: string | null;
  voiceUrl: string | null;
  voiceTranscript: string | null;
  textNote: string | null;
  status: string;
  aiGeneratedPosts: unknown;
  agencyNote: string | null;
  createdAt: Date;
};

const CAPTURE_STATUS: Record<string, { label: string; color: string }> = {
  pending_ai: { label: "AI processing…", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  ai_ready:   { label: "Ready to review", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  approved:   { label: "Approved",        color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  rejected:   { label: "Rejected",        color: "bg-red-500/20 text-red-300 border-red-500/30" },
};

function CaptureCard({ capture, onAction }: { capture: QuickCapture; onAction: () => void }) {
  const [editedPosts, setEditedPosts] = useState<Record<string, string>>(
    (capture.aiGeneratedPosts as Record<string, string>) || {}
  );
  const [rejectNote, setRejectNote] = useState("");
  const [showReject, setShowReject] = useState(false);

  const approveMutation = trpc.quickCapture.approve.useMutation({
    onSuccess: () => { toast.success("Capture approved and ready to publish!"); onAction(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.quickCapture.reject.useMutation({
    onSuccess: () => { toast.success("Capture rejected"); onAction(); setShowReject(false); },
    onError: (e) => toast.error(e.message),
  });

  const status = CAPTURE_STATUS[capture.status] || { label: capture.status, color: "bg-white/10 text-white/50" };
  const aiPosts = (capture.aiGeneratedPosts as Record<string, string>) || {};
  const platforms = Object.keys(aiPosts);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Photo + transcript */}
      <div className="flex gap-4 p-4">
        {capture.mediaUrl ? (
          <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-white/5">
            <img src={capture.mediaUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
            <ImageIcon className="w-8 h-8 text-white/20" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
            <span className="text-xs text-white/30">Workspace {capture.workspaceId}</span>
            <span className="text-xs text-white/20 ml-auto">{new Date(capture.createdAt).toLocaleDateString()}</span>
          </div>
          {capture.voiceTranscript ? (
            <div className="flex gap-1.5">
              <Mic className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
              <p className="text-sm text-white/70 leading-relaxed">{capture.voiceTranscript}</p>
            </div>
          ) : capture.textNote ? (
            <p className="text-sm text-white/70 leading-relaxed">{capture.textNote}</p>
          ) : (
            <p className="text-sm text-white/30 italic">No voice note or text</p>
          )}
        </div>
      </div>

      {/* AI captions (editable) */}
      {platforms.length > 0 && capture.status !== "pending_ai" && (
        <div className="border-t border-white/10 p-4 space-y-3">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">AI-generated captions — edit if needed</p>
          {platforms.map((platform) => (
            <div key={platform}>
              <p className="text-xs text-white/30 mb-1 capitalize">{platform}</p>
              <Textarea
                value={editedPosts[platform] ?? ""}
                onChange={(e) => setEditedPosts((p) => ({ ...p, [platform]: e.target.value }))}
                rows={3}
                className="bg-white/5 border-white/10 text-sm text-white resize-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {(capture.status === "ai_ready" || capture.status === "pending_ai") && (
        <div className="border-t border-white/10 p-4 space-y-3">
          {showReject ? (
            <div className="space-y-2">
              <Input
                placeholder="Reason for rejection (optional)"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="bg-white/5 border-white/10 text-sm"
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowReject(false)} className="text-white/40">Cancel</Button>
                <Button
                  size="sm"
                  onClick={() => rejectMutation.mutate({ captureId: capture.id, note: rejectNote })}
                  disabled={rejectMutation.isPending}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 gap-1.5"
                >
                  {rejectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                  Confirm reject
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => approveMutation.mutate({ captureId: capture.id, editedPosts })}
                disabled={approveMutation.isPending || capture.status === "pending_ai"}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 gap-1.5"
              >
                {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                {capture.status === "pending_ai" ? "Waiting for AI…" : "Approve & schedule"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowReject(true)}
                className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 gap-1.5"
              >
                <ThumbsDown className="w-3.5 h-3.5" /> Reject
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ApprovalQueue() {
  const [mainTab, setMainTab] = useState<"uploads" | "posts">("uploads");
  const [statusFilter, setStatusFilter] = useState<"pending_agency" | "pending_client" | "approved" | "rejected" | "all">("pending_agency");
  const [captureFilter, setCaptureFilter] = useState<"ai_ready" | "approved" | "rejected" | "all">("ai_ready");

  const { data: stats } = trpc.approval.getStats.useQuery(undefined, { refetchInterval: 30000 });
  const { data: posts, isLoading: postsLoading, refetch: refetchPosts } = trpc.approval.getPendingPosts.useQuery(
    { status: statusFilter, limit: 50 },
    { refetchInterval: 60000, enabled: mainTab === "posts" }
  );
  const { data: captures, isLoading: capturesLoading, refetch: refetchCaptures } = trpc.quickCapture.listAllPending.useQuery(
    { status: captureFilter === "all" ? undefined : captureFilter },
    { refetchInterval: 30000, enabled: mainTab === "uploads" }
  );

  const pendingCaptures = captures?.filter(c => c.status === "ai_ready" || c.status === "pending_ai").length ?? 0;

  const postFilters: Array<{ key: typeof statusFilter; label: string; count?: number }> = [
    { key: "pending_agency", label: "Needs review", count: stats?.pendingAgency },
    { key: "pending_client", label: "With client",  count: stats?.pendingClient },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];
  const captureFilters: Array<{ key: typeof captureFilter; label: string }> = [
    { key: "ai_ready",  label: "Ready to review" },
    { key: "approved",  label: "Approved" },
    { key: "rejected",  label: "Rejected" },
    { key: "all",       label: "All" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Approval Queue</h1>
            <p className="text-sm text-white/50 mt-1">Review client uploads and AI-drafted posts before they go live.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => mainTab === "uploads" ? refetchCaptures() : refetchPosts()} className="text-white/40 hover:text-white gap-1.5">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setMainTab("uploads")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${mainTab === "uploads" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}
          >
            <Camera className="w-4 h-4" />
            Content Uploads
            {pendingCaptures > 0 && (
              <span className="bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingCaptures}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMainTab("posts")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${mainTab === "posts" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}
          >
            <Send className="w-4 h-4" />
            Scheduled Posts
            {(stats?.pendingAgency ?? 0) > 0 && (
              <span className="bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">{stats!.pendingAgency}</span>
            )}
          </button>
        </div>

        {/* ── Content Uploads tab ── */}
        {mainTab === "uploads" && (
          <>
            <div className="flex gap-2 flex-wrap">
              {captureFilters.map((f) => (
                <button key={f.key} type="button" onClick={() => setCaptureFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${captureFilter === f.key ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {capturesLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
            ) : !captures?.length ? (
              <div className="text-center py-16">
                <Camera className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No uploads in this category</p>
                <p className="text-white/20 text-xs mt-1">Clients submit content via Quick Upload in their dashboard</p>
              </div>
            ) : (
              <div className="space-y-4">
                {captures.map((c) => (
                  <CaptureCard key={c.id} capture={c as QuickCapture} onAction={() => refetchCaptures()} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Scheduled Posts tab ── */}
        {mainTab === "posts" && (
          <>
            {stats && (stats.pendingAgency > 0 || stats.pendingClient > 0) && (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-200">
                  {stats.pendingAgency > 0 && <><strong>{stats.pendingAgency} post{stats.pendingAgency !== 1 ? "s" : ""}</strong> need your review. </>}
                  {stats.pendingClient > 0 && <><strong>{stats.pendingClient} post{stats.pendingClient !== 1 ? "s" : ""}</strong> are waiting for client approval.</>}
                </p>
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {postFilters.map((f) => (
                <button key={f.key} type="button" onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === f.key ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
                >
                  {f.label}
                  {f.count !== undefined && f.count > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">{f.count}</span>
                  )}
                </button>
              ))}
            </div>
            {postsLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
            ) : !posts?.length ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No posts in this category</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostRow key={post.id} post={post as Post} onAction={() => refetchPosts()} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
