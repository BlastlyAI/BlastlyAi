import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Share2, Linkedin, Twitter, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ShareScoreButtonProps {
  reportType: "digital_presence" | "seo" | "competitor";
  websiteUrl: string;
  overallScore?: number;
  scanData: any;
  isPublic?: boolean; // true = user not logged in, use createPublicShare
}

export function ShareScoreButton({
  reportType,
  websiteUrl,
  overallScore,
  scanData,
  isPublic = false,
}: ShareScoreButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createShare = trpc.shareReport.createShare.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
    },
    onError: () => toast.error("Could not create share link. Please try again."),
  });

  const createPublicShare = trpc.shareReport.createPublicShare.useMutation({
    onSuccess: (data) => {
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
    },
    onError: () => toast.error("Could not create share link. Please try again."),
  });

  const isPending = createShare.isPending || createPublicShare.isPending;

  async function generateLink() {
    if (shareUrl) return shareUrl;
    const payload = { reportType, websiteUrl, overallScore, scanData };
    if (isPublic) {
      const result = await createPublicShare.mutateAsync(payload);
      return `${window.location.origin}${result.shareUrl}`;
    } else {
      const result = await createShare.mutateAsync(payload);
      return `${window.location.origin}${result.shareUrl}`;
    }
  }

  async function handleCopy() {
    const url = await generateLink();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleLinkedIn() {
    const url = await generateLink();
    const text = encodeURIComponent(
      `I just scanned my business with Blastly and got a Digital Presence Score of ${overallScore ?? "??"}/100. See the full report:`
    );
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${text}`,
      "_blank"
    );
  }

  async function handleX() {
    const url = await generateLink();
    const text = encodeURIComponent(
      `My business scored ${overallScore ?? "??"}/100 on @BlastlyAI's Digital Presence Scanner 🚀\n\nSee the full report: ${url}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={isPending}>
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          Share My Score
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={handleLinkedIn} className="gap-2 cursor-pointer">
          <Linkedin className="w-4 h-4 text-blue-400" />
          Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleX} className="gap-2 cursor-pointer">
          <Twitter className="w-4 h-4" />
          Share on X
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
          {copied ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copied ? "Copied!" : "Copy Link"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
