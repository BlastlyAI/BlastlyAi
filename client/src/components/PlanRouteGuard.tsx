import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { usePlanAccess } from "@/hooks/usePlanAccess";

/** Redirect free users away from Command Centre routes. */
export function PaidCommandCentreGuard({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { isPaid, isLoading } = usePlanAccess();

  useEffect(() => {
    if (isLoading) return;
    if (!isPaid) navigate("/dashboard/home");
  }, [isPaid, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!isPaid) return null;
  return <>{children}</>;
}

/** Redirect paid users from free dashboard to Command Centre. */
export function FreeDashboardGuard({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { isPaid, isLoading } = usePlanAccess();

  useEffect(() => {
    if (isLoading) return;
    if (isPaid) navigate("/command-centre");
  }, [isPaid, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (isPaid) return null;
  return <>{children}</>;
}
