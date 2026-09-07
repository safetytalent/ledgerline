import SideNav from "@/components/nav/SideNav";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const STALE_DAYS = 14;
const UNMATCHED_CONFIDENCE_CEILING = 40;

export default async function AnomaliesPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: [{ clientId: "asc" }, { vendorName: "asc" }, { txnDate: "asc" }],
    include: { client: { select: { name: true } } },
  });

  // Real duplicate-payment detection: same client + vendor + amount,
  // within 48 hours of each other. Computed here in JS rather than a
  // SQL window function — simple, correct, and easy to read.
  type Txn = (typeof transactions)[number];
  const duplicates: { a: Txn; b: Txn }[] = [];

  for (let i = 0; i < transactions.length - 1; i++) {
    const a = transactions[i];
    const b = transactions[i + 1];
    if (
      a.clientId === b.clientId &&
      a.vendorName === b.vendorName &&
      Number(a.amount) === Number(b.amount) &&
      Math.abs(b.txnDate.getTime() - a.txnDate.getTime()) <= 48 * 60 * 60 * 1000
    ) {
      duplicates.push({ a, b });
    }
  }

  // Phase C, Reconciliation Agent: "stale outstanding items" — sitting
  // in review for more than STALE_DAYS with nobody having acted on it.
  const now = Date.now();
  const stale = transactions.filter(
    (t: Txn) =>
      t.reviewStatus === "PENDING_REVIEW" &&
      now - t.createdAt.getTime() > STALE_DAYS * 24 * 60 * 60 * 1000
  );

  // Phase C, Reconciliation Agent: "unmatched items" — the agent found
  // no rule or memory match at all (confidence floor-level), meaning
  // this vendor/pattern has never been seen and confirmed before.
  const unmatched = transactions.filter(
    (t: Txn) => t.reviewStatus === "PENDING_REVIEW" && t.confidenceScore <= UNMATCHED_CONFIDENCE_CEILING
  );

  const daysAgo = (d: Date) => Math.floor((now - d.getTime()) / (24 * 60 * 60 * 1000));

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Anomalies</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Duplicate payments, unmatched items, and stale outstanding items — real
            reconciliation flags computed from your transaction history
          </p>
        </div>
        <div className="px-8 py-5 max-w-3xl">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B675E] mb-2">
            Duplicate payments
          </h2>
          {duplicates.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-4 mb-4">None detected right now.</div>
          ) : (
            duplicates.map(({ a, b }, i) => (
              <div
                key={i}
                className="bg-white border border-line border-l-[3px] border-l-rust p-4 mb-2.5"
              >
                <div className="font-semibold text-[14px] mb-1">
                  {a.client.name} — possible duplicate payment
                </div>
                <div className="text-[12.5px] text-[#6B675E]">
                  Two payments to <strong>{a.vendorName}</strong> for{" "}
                  <strong>${Number(a.amount).toLocaleString()}</strong>, within 48 hours (
                  {a.txnDate.toLocaleDateString()} and {b.txnDate.toLocaleDateString()}).
                </div>
              </div>
            ))
          )}

          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B675E] mb-2 mt-6">
            Stale outstanding items ({STALE_DAYS}+ days awaiting review)
          </h2>
          {stale.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-4 mb-4">None right now.</div>
          ) : (
            stale.map((t: Txn) => (
              <div
                key={t.id}
                className="bg-white border border-line border-l-[3px] border-l-brass p-4 mb-2.5"
              >
                <div className="font-semibold text-[14px] mb-1">
                  {t.client.name} — {t.vendorName}
                </div>
                <div className="text-[12.5px] text-[#6B675E]">
                  ${Number(t.amount).toLocaleString()}, sitting in review for {daysAgo(t.createdAt)} days.
                </div>
              </div>
            ))
          )}

          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B675E] mb-2 mt-6">
            Unmatched items (no rule or history match found)
          </h2>
          {unmatched.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-4">None right now.</div>
          ) : (
            unmatched.map((t: Txn) => (
              <div
                key={t.id}
                className="bg-white border border-line border-l-[3px] border-l-[#6B675E] p-4 mb-2.5"
              >
                <div className="font-semibold text-[14px] mb-1">
                  {t.client.name} — {t.vendorName}
                </div>
                <div className="text-[12.5px] text-[#6B675E]">
                  ${Number(t.amount).toLocaleString()} — {t.confidenceScore}% confidence, first time seeing this vendor.
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
