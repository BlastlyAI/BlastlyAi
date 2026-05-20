import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { fetchUserProfile } from "@/lib/supabaseProfile";
import { supabaseSignOut } from "@/lib/supabaseAuth";
import type { AppUser } from "@/types/appUser";

type SupabaseAuthContextValue = {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setUser(null);
      return;
    }
    const profile = await fetchUserProfile(nextSession.user);
    setUser(profile);
    localStorage.setItem("blastly-user-info", JSON.stringify(profile));
  }, []);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    setSession(data.session ?? null);
    await loadProfile(data.session ?? null);
  }, [loadProfile]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
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
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await supabaseSignOut();
    setSession(null);
    setUser(null);
    localStorage.removeItem("blastly-user-info");
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      error,
      isAuthenticated: Boolean(user && session),
      refresh,
      logout,
    }),
    [session, user, loading, error, refresh, logout]
  );

  return (
    <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuthContext(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    throw new Error("useSupabaseAuthContext must be used within SupabaseAuthProvider");
  }
  return ctx;
}
