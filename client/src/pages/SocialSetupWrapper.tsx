/**
 * SocialSetupWrapper — Route wrapper for the 3-step social setup guide.
 * Reads the active workspaceId from WorkspaceContext and passes it to SocialSetup.
 */
import { useLocation } from "wouter";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trpc } from "@/lib/trpc";
import SocialSetup from "./SocialSetup";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function SocialSetupWrapper() {
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const { currentWorkspace, isLoading: wsLoading } = useWorkspace();
  const [, navigate] = useLocation();

  if (authLoading || wsLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-white/60">Please sign in to set up your social accounts.</p>
        <Button
          onClick={() => { window.location.href = getLoginUrl(); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Sign in
        </Button>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-white/60">No workspace found. Please complete onboarding first.</p>
        <Button onClick={() => navigate("/onboarding")} className="bg-blue-600 hover:bg-blue-700">
          Start onboarding
        </Button>
      </div>
    );
  }

  return <SocialSetup workspaceId={currentWorkspace.id} />;
}
