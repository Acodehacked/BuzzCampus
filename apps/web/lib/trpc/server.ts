import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { createCallerFactory, createContext } from "../../server/trpc";
import { appRouter } from "../../server/routers/_app";

/**
 * A server-side tRPC caller for React Server Components. Calls the router
 * directly — no HTTP hop for the initial render — so a page renders its
 * data on the server and hydrates without a loading flash.
 */
const createCaller = createCallerFactory(appRouter);

export const api = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");
  return createCaller(await createContext({ headers: heads }));
});
