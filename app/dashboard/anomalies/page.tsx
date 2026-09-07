import SideNav from "@/components/nav/SideNav";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Anomalies</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Real duplicate-payment detection across your transaction history
          </p>
        </div>
        <div className="px-8 py-5 max-w-3xl">
          {duplicates.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-8 text-center">
              No duplicate payments detected right now.
            </div>
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
        </div>
      </div>
    </div>
  );
}
