import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import SupabaseConfigError from "@/components/SupabaseConfigError";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getSupabaseEnvConfig } from "@/lib/supabaseEnv";
import { fetchUserProfile } from "@/lib/supabaseProfile";
import { supabaseSignOut } from "@/lib/supabaseAuth";
import type { AppUser } from "@/types/appUser";

type SupabaseAuthContextValue = {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  configured: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

function SupabaseAuthProviderInner({
  children,
  supabase,
}: {
  children: ReactNode;
  supabase: SupabaseClient;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = useCallback(
    async (nextSession: Session | null) => {
      if (!nextSession?.user) {
        setUser(null);
        return;
      }
      const profile = await fetchUserProfile(nextSession.user, supabase);
      setUser(profile);
      localStorage.setItem("blastly-user-info", JSON.stringify(profile));
    },
    [supabase]
  );

  const refresh = useCallback(async () => {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    setSession(data.session ?? null);
    await loadProfile(data.session ?? null);
  }, [loadProfile, supabase]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!mounted) return;
        setSession(data.session ?? null);
        await loadProfile(data.session ?? null);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      try {
        await loadProfile(nextSession);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, supabase]);

  const logout = useCallback(async () => {
    await supabaseSignOut(supabase);
    setSession(null);
    setUser(null);
    localStorage.removeItem("blastly-user-info");
  }, [supabase]);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      error,
      isAuthenticated: Boolean(user && session),
      configured: true,
      refresh,
      logout,
    }),
    [session, user, loading, error, refresh, logout]
  );

  return (
    <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>
  );
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const config = getSupabaseEnvConfig();
  const supabase = config ? getSupabaseBrowserClient() : null;

  if (!config || !supabase) {
    return <SupabaseConfigError />;
  }

  return (
    <SupabaseAuthProviderInner supabase={supabase}>{children}</SupabaseAuthProviderInner>
  );
}

export function useSupabaseAuthContext(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    throw new Error("useSupabaseAuthContext must be used within SupabaseAuthProvider");
  }
  return ctx;
}
