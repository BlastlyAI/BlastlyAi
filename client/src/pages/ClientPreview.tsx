import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle, CheckCircle2, Flag, ThumbsUp, Calendar,
  Zap, Loader2, MessageSquare, X
} from "lucide-react";
import { useState } from "react";
import { useRoute } from "wouter";

type PreviewPost = {
  id: number;
  title: string | null;
  bodyText: string | null;
  mediaUrls: unknown;
  hashtags: unknown;
  approvalStatus: string;
  clientNote: string | null;
  scheduledAt: Date | null;
  previewToken: string | null;
};

function PostCard({
  post,
  previewToken,
  onFlagged,
}: {
  post: PreviewPost;
  previewToken: string;
  onFlagged: () => void;
}) {
  const [flagging, setFlagging] = useState(false);
  const [note, setNote] = useState("");
  const [flagged, setFlagged] = useState(false);

  const flagMutation = trpc.approval.clientFlag.useMutation({
    onSuccess: () => {
      setFlagged(true);
      setFlagging(false);
      onFlagged();
    },
  });

  const hashtags = Array.isArray(post.hashtags) ? post.hashtags as string[] : [];
  const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls as string[] : [];

  if (flagged) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 flex items-center gap-4">
        <Flag className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <div>
          <p className="font-semibold text-amber-300">Flagged for review</p>
          <p className="text-sm text-white/50">Our team will review your note and get back to you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Media preview */}
      {mediaUrls.length > 0 && (
        <div className="aspect-video bg-black/30 overflow-hidden">
          <img src={mediaUrls[0]} alt="Post media" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Scheduled date */}
        {post.scheduledAt && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Calendar className="w-3.5 h-3.5" />
            <span>Scheduled for {new Date(post.scheduledAt).toLocaleDateString("en-AU", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
              hour: "2-digit", minute: "2-digit"
            })}</span>
          </div>
        )}

        {/* Title */}
        {post.title && (
          <h3 className="font-semibold text-white text-base">{post.title}</h3>
        )}

        {/* Body */}
        {post.bodyText && (
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{post.bodyText}</p>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((tag) => (
              <span key={tag} className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                #{tag.replace(/^#/, "")}
              </span>
            ))}
          </div>
        )}

        {/* Flag section */}
        {!flagging ? (
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <p className="text-xs text-white/40 flex-1">Does this look right for your business?</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => setFlagging(true)}
            >
              <Flag className="w-3.5 h-3.5" />
              Flag this
            </Button>
          </div>
        ) : (
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-amber-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                What needs changing?
              </p>
              <button onClick={() => setFlagging(false)} className="text-white/30 hover:text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. The price is wrong, please change $49 to $59. Also remove the competitor mention."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm min-h-[80px]"
            />
            <Button
              onClick={() => flagMutation.mutate({ previewToken, postId: post.id, note })}
              disabled={!note.trim() || flagMutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {flagMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
              Send feedback
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientPreview() {
  const [, params] = useRoute("/preview/:token");
  const token = params?.token ?? "";
  const [allApproved, setAllApproved] = useState(false);
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, error, refetch } = trpc.approval.getClientPreview.useQuery(
    { previewToken: token },
    { enabled: !!token }
  );

  const approveAllMutation = trpc.approval.clientApproveAll.useMutation({
    onSuccess: () => setAllApproved(true),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <p className="text-white/50 text-sm">Loading your content preview…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="font-semibold text-white">Preview not found</p>
          <p className="text-sm text-white/40 mt-1">This link may have expired or already been used.</p>
        </div>
      </div>
    );
  }

  if (allApproved) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">All approved!</h2>
          <p className="text-white/50 text-sm">
            Your content has been approved and will be posted as scheduled. We'll send you a summary after each post goes live.
          </p>
        </div>
      </div>
    );
  }

  const activePosts = data.posts.filter(p => !flaggedIds.has(p.id));

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <div className="bg-[#0d1426] border-b border-white/10 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/40">Content preview for</p>
              <p className="font-bold text-white text-sm">{data.workspaceName}</p>
            </div>
          </div>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
            {activePosts.length} post{activePosts.length !== 1 ? "s" : ""} to review
          </Badge>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Intro */}
        <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-5">
          <h2 className="font-bold text-white mb-1">Your upcoming social media posts</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Review the posts below. If everything looks good, tap <strong className="text-white">Approve All</strong> and they'll go live as scheduled.
            If anything needs changing, tap <strong className="text-amber-300">Flag this</strong> on that post and leave a note — our team will fix it.
          </p>
        </div>

        {/* Posts */}
        {activePosts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-emerald-400/50 mx-auto mb-3" />
            <p className="text-white/50">All posts have been reviewed.</p>
          </div>
        ) : (
          activePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              previewToken={token}
              onFlagged={() => {
                setFlaggedIds(prev => new Set(Array.from(prev).concat(post.id)));
                refetch();
              }}
            />
          ))
        )}

        {/* Approve all CTA */}
        {activePosts.length > 0 && (
          <div className="sticky bottom-6">
            <Button
              onClick={() => approveAllMutation.mutate({ previewToken: token })}
              disabled={approveAllMutation.isPending}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-500/20"
            >
              {approveAllMutation.isPending
                ? <Loader2 className="w-5 h-5 animate-spin mr-2" />
                : <ThumbsUp className="w-5 h-5 mr-2" />}
              Looks great — Approve All
            </Button>
            <p className="text-center text-xs text-white/30 mt-2">
              Posts will go live at their scheduled times
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
