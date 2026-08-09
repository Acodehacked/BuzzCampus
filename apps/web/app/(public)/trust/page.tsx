import { TrustDashboard } from "../../../components/trust/TrustDashboard";

export const metadata = {
  title: "Trust dashboard",
  description:
    "Open numbers on whether this campus actually works — issues resolved, skills traded, projects shipped.",
};
export const dynamic = "force-dynamic";

export default function TrustPage() {
  return (
    <div className="shell-column py-14">
      <header className="mb-10 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-text-muted">
          Public · no account needed
        </p>
        <h1 className="mt-4 text-3xl leading-tight tracking-tight text-text-primary-light">
          Does this campus actually work?
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          Every number here comes from the same append-only event history the
          platform runs on — the ones that look bad are here too. Sensitive
          reports are excluded entirely; they never leave the Safety
          Officer&apos;s queue.
        </p>
      </header>

      <TrustDashboard />
    </div>
  );
}
