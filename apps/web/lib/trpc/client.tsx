"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState, type ReactNode } from "react";
import superjson from "superjson";
import type { AppRouter } from "../../server/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

function baseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The feed is meant to feel live without hammering the server:
            // fresh for 20s, and the SSE stream invalidates it when
            // something actually changes.
            staleTime: 20_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              const code = (error as { data?: { code?: string } })?.data?.code;
              if (
                code === "UNAUTHORIZED" ||
                code === "FORBIDDEN" ||
                code === "NOT_FOUND"
              ) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" &&
            typeof window !== "undefined" &&
            opts.direction === "down" &&
            opts.result instanceof Error,
        }),
        httpBatchLink({
          url: `${baseUrl()}/api/trpc`,
          transformer: superjson,
          maxURLLength: 2000,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
