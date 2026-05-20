import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type Workspace = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
  // Brand identity fields
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  toneOfVoice?: string | null;
  targetAudience?: string | null;
  // Extended profile fields (pre-filled from audit)
  tagline?: string | null;
  phone?: string | null;
  address?: string | null;
  googleReviewUrl?: string | null;
  geographicReach?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  // Subscription / billing
  planTier?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | null;
};

type WorkspaceContextType = {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace) => void;
  isLoading: boolean;
  refetch: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [], currentWorkspace: null, setCurrentWorkspace: () => {}, isLoading: true, refetch: () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const createWorkspace = trpc.workspace.create.useMutation();

  const { data: workspaces = [], isLoading, refetch } = trpc.workspace.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated && workspaces.length === 0 && !createWorkspace.isPending) {
      createWorkspace.mutate({ name: "My Workspace" }, { onSuccess: () => refetch() });
    }
  }, [isLoading, isAuthenticated, workspaces.length]);

  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspace) {
      const saved = localStorage.getItem("blastly_workspace_id");
      const found = saved ? workspaces.find((w) => w.id === Number(saved)) : null;
      setCurrentWorkspaceState(found ?? workspaces[0]);
    }
  }, [workspaces, currentWorkspace]);

  const setCurrentWorkspace = (ws: Workspace) => {
    setCurrentWorkspaceState(ws);
    localStorage.setItem("blastly_workspace_id", String(ws.id));
  };

  return (
    <WorkspaceContext.Provider value={{ workspaces, currentWorkspace, setCurrentWorkspace, isLoading, refetch }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
