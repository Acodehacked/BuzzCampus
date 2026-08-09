import { WalletView } from "../../../components/wallet/WalletView";

export const metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";

export default function WalletPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl tracking-tight text-text-primary-dark">Wallet</h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-muted">
          One balance for everything. Credits earned resolving a Campus issue,
          teaching a Skills session or hitting a Builds milestone all land in
          the same place.
        </p>
      </div>
      <WalletView />
    </div>
  );
}
