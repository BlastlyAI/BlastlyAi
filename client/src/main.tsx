import { trpc } from "@/lib/trpc";
import { apiUrl, isStaticProductionWithoutApi } from "@/lib/apiOrigin";
import { createOfflineTrpcLink, isStaticApiTrpcError } from "@/lib/trpcOfflineLink";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, splitLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getAppLoginPath } from "./const";
import "./index.css";

const staticNoApi = isStaticProductionWithoutApi();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,   // 30 s — avoids redundant refetches on every render
      retry: staticNoApi ? false : 1, // no pointless retries when API is intentionally offline
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: staticNoApi ? false : undefined,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getAppLoginPath("/command");
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    if (isStaticApiTrpcError(error)) return;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (isStaticApiTrpcError(error)) return;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

async function trpcFetch(input: RequestInfo | URL, init?: RequestInit) {
  const res = await globalThis.fetch(input, {
    ...(init ?? {}),
    credentials: "include",
  });
  if (import.meta.env.PROD) {
    const ct = res.headers.get("content-type") ?? "";
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : "";
    if (ct.includes("text/html") && url.includes("/api/trpc")) {
      throw TRPCClientError.from({
        error: {
          message:
            "The API returned HTML instead of JSON. Set VITE_API_ORIGIN in Vercel to your Express server URL (same path /api/trpc must exist there).",
          code: -32004,
          data: {
            code: "BAD_GATEWAY" as const,
            httpStatus: 502,
            staticApiMode: true,
          },
        },
      });
    }
  }
  return res;
}

const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: () => staticNoApi,
      true: createOfflineTrpcLink(),
      false: httpBatchLink({
        url: apiUrl("/api/trpc"),
        transformer: superjson,
        fetch: trpcFetch,
      }),
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
