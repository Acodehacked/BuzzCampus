import { CATEGORY, Surface, cn, type CategoryKey } from "@buzz/ui";
import { PrintButton } from "../../../../components/profile/PrintButton";
import { api } from "../../../../lib/trpc/server";

export const metadata = { title: "Verified contributions" };
export const dynamic = "force-dynamic";

/**
 * The Verified Contributions export (docs/PRD.md §6.4 #7).
 *
 * One signed-looking document covering issues fixed, hours taught and
 * projects shipped — the résumé artefact. Rendered as a print stylesheet
 * rather than generated server-side, which keeps a PDF toolchain out of the
 * bundle and still produces a real PDF through the browser's print dialog.
 */
export default async function ExportPage() {
  const caller = await api();
  const record = await caller.profile.contributionRecord();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl tracking-tight text-text-primary-dark">
            Verified contributions
          </h1>
          <p className="mt-1 max-w-lg text-sm leading-relaxed text-text-muted">
            Everything you&apos;ve completed on Buzz, in one document. Every
            line traces back to a verified post with an immutable history.
          </p>
        </div>
        <PrintButton />
      </div>

      <Surface className="p-8 print:border-0 print:bg-white print:p-0 print:text-black">
        <header className="border-b border-graphite-700 pb-5 print:border-black/20">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-text-muted print:text-black/60">
            Buzz · Verified contribution record
          </p>
          <h2 className="mt-2 font-display text-xl tracking-tight text-text-primary-dark print:text-black">
            {record.user?.name}
          </h2>
          <p className="mt-1 font-mono text-xs tabular-nums text-text-muted print:text-black/60">
            {record.user?.email}
            {record.user?.department ? ` · ${record.user.department}` : ""}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-text-muted print:text-black/60">
            Issued {record.issuedAt.toLocaleDateString()} · Buzz Score{" "}
            {record.score.total} · active in {record.score.categoriesActive} of 3
            categories
          </p>
        </header>

        <section className="mt-6">
          <h3 className="mb-3 text-xs uppercase tracking-[0.1em] text-text-muted print:text-black/60">
            Summary
          </h3>
          <table className="w-full text-sm">
            <tbody>
              {record.summary.map((row) => (
                <tr
                  key={row.category}
                  className="border-b border-graphite-700/70 print:border-black/10"
                >
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "h-1.5 w-1.5 rounded-sm print:hidden",
                          CATEGORY[row.category as CategoryKey].dot,
                        )}
                      />
                      <span className="text-text-primary-dark print:text-black">
                        {row.label}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-text-muted print:text-black/70">
                    {row.count} {row.count === 1 ? "contribution" : "contributions"}
                  </td>
                  <td className="w-20 py-2.5 text-right font-mono tabular-nums text-text-primary-dark print:text-black">
                    {row.points} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h3 className="mb-3 text-xs uppercase tracking-[0.1em] text-text-muted print:text-black/60">
            Record
          </h3>
          {record.detailed.length === 0 ? (
            <p className="text-sm text-text-muted">
              Nothing verified yet. Complete an Ask or a Give and it appears
              here permanently.
            </p>
          ) : (
            <ul className="space-y-0">
              {record.detailed.map((entry, index) => (
                <li
                  key={index}
                  className="flex items-baseline gap-3 border-b border-graphite-700/70 py-2 text-sm last:border-0 print:border-black/10"
                >
                  <span className="w-24 shrink-0 font-mono text-xs tabular-nums text-text-muted print:text-black/60">
                    {entry.createdAt?.toLocaleDateString()}
                  </span>
                  <span
                    className={cn(
                      "w-16 shrink-0 text-xs capitalize",
                      CATEGORY[entry.category as CategoryKey].tagText,
                      "print:text-black/70",
                    )}
                  >
                    {entry.category}
                  </span>
                  <span className="min-w-0 flex-1 text-text-primary-dark print:text-black">
                    {entry.postTitle ?? "Contribution"}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-text-muted print:text-black/60">
                    +{entry.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-8 border-t border-graphite-700 pt-4 print:border-black/20">
          <p className="text-[0.6875rem] leading-relaxed text-text-muted print:text-black/60">
            Each entry corresponds to a post that reached <em>verified</em>
            {" "}status, with a timestamped, append-only event history retained
            by the platform. Records can be checked against the original post.
          </p>
        </footer>
      </Surface>
    </div>
  );
}
