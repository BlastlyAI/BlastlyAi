import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ensureDefaultWorkspace,
  listWorkspacesForUser,
  type AppWorkspace,
} from "@/lib/supabaseWorkspace";
import { ensureDefaultWorkspaceApi, listWorkspacesApi } from "@/lib/workspaceApi";
import { loadDashboardProfile } from "@/lib/dashboardProfile";

export type Workspace = AppWorkspace & {
  logoUrl?: string | null;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  toneOfVoice?: string | null;
  targetAudience?: string | null;
  tagline?: string | null;
  phone?: string | null;
  address?: string | null;
  googleReviewUrl?: string | null;
  geographicReach?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  planTier?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | null;
};

type WorkspaceContextType = {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace) => void;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  currentWorkspace: null,
  setCurrentWorkspace: () => { },
  isLoading: true,
  refetch: async () => { },
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const profile = loadDashboardProfile();
      let list = await listWorkspacesApi();
      if (list.length === 0) {
        list = await listWorkspacesForUser(user.id);
      }
      if (list.length === 0) {
        const ensured = await ensureDefaultWorkspaceApi({
          businessName: profile?.businessName ?? user.businessName ?? undefined,
          website: profile?.website ?? undefined,
        });
        if (ensured) list = [ensured];
      }
      if (list.length === 0) {
        list = await ensureDefaultWorkspace(user.id, user.businessName ?? "My Workspace");
      }
      const mapped: Workspace[] = list.map((w) => ({ ...w }));
      setWorkspaces(mapped);
      const savedId = localStorage.getItem("blastly_workspace_id");
      if (savedId) {
        const refreshed = mapped.find((w) => w.supabaseId === savedId || String(w.id) === savedId);
        if (refreshed) setCurrentWorkspaceState(refreshed);
      }
    } catch (e) {
      console.warn("[Blastly] workspace load failed:", e);
      setWorkspaces([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setIsLoading(false);
      return;
    }
    void refetch();
  }, [isAuthenticated, user?.id, refetch]);

  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspace) {
      const saved = localStorage.getItem("blastly_workspace_id");
      const found = saved
        ? workspaces.find((w) => String(w.id) === saved || w.supabaseId === saved)
        : null;
      setCurrentWorkspaceState(found ?? workspaces[0]);
    }
  }, [workspaces, currentWorkspace]);

  const setCurrentWorkspace = (ws: Workspace) => {
    setCurrentWorkspaceState(ws);
    localStorage.setItem("blastly_workspace_id", ws.supabaseId);
  };

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, currentWorkspace, setCurrentWorkspace, isLoading, refetch }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
