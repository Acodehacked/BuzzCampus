import { router } from "../trpc";
import { accountRouter } from "./account";
import { adminRouter } from "./admin";
import { buildRouter } from "./build";
import { postRouter } from "./post";
import { profileRouter } from "./profile";
import { trustRouter } from "./trust";
import { walletRouter } from "./wallet";

export const appRouter = router({
  post: postRouter,
  wallet: walletRouter,
  build: buildRouter,
  profile: profileRouter,
  trust: trustRouter,
  admin: adminRouter,
  account: accountRouter,
});

export type AppRouter = typeof appRouter;
