import { logSupabaseEnvDiagnostics } from "@/lib/supabaseEnv";
import { trpc } from "@/lib/trpc";
import { apiUrl, getApiOrigin } from "@/lib/apiOrigin";
import { createStubTrpcLink } from "@/lib/trpcStubLink";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, splitLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { SupabaseAuthProvider } from "./contexts/SupabaseAuthContext";
import "./index.css";

logSupabaseEnvDiagnostics();

const hasExternalApi = Boolean(getApiOrigin());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: hasExternalApi ? 1 : false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: () => !hasExternalApi,
      true: createStubTrpcLink(),
      false: httpBatchLink({
        url: apiUrl("/api/trpc"),
        transformer: superjson,
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
          });
        },
      }),
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <SupabaseAuthProvider>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </SupabaseAuthProvider>
);
