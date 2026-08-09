import { redirect } from "next/navigation";
import { OnboardingFlow } from "../../components/onboarding/OnboardingFlow";
import { api } from "../../lib/trpc/server";

export const metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

/**
 * Onboarding sits outside both the public shell and the app shell — it's
 * full-bleed by design, and a nav bar over it would break the effect and
 * offer an exit before the point has landed. Skip is always one tap away
 * in the corner instead.
 */
export default async function WelcomePage() {
  const caller = await api();
  const me = await caller.profile.me().catch(() => null);

  if (!me) redirect("/login");

  return <OnboardingFlow firstName={me.name.split(" ")[0] ?? "there"} />;
}
