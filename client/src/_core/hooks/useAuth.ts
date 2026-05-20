import { getAppLoginPath } from "@/const";
import { useSupabaseAuthContext } from "@/contexts/SupabaseAuthContext";
import { useEffect } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

/** Auth state from Supabase session + public.users profile (no MySQL / tRPC). */
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getAppLoginPath() } =
    options ?? {};
  const auth = useSupabaseAuthContext();

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (auth.loading) return;
    if (auth.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;
    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, auth.loading, auth.user]);

  return {
    user: auth.user,
    loading: auth.loading,
    error: auth.error,
    isAuthenticated: auth.isAuthenticated,
    refresh: auth.refresh,
    logout: auth.logout,
  };
}
