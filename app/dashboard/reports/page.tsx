import SideNav from "@/components/nav/SideNav";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Phase E: read-only financial reporting from approved, closed books
// only (reviewStatus = APPROVED). No drafting judgment involved —
// this just totals what a human already signed off on.
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ReportsPage() {
  const approved = await prisma.transaction.findMany({
    where: { reviewStatus: "APPROVED" },
    include: { client: { select: { name: true } } },
    orderBy: { txnDate: "asc" },
  });

  type Txn = (typeof approved)[number];

  // Real P&L: income vs expense, from transactions actually approved
  // by a human. Grouped by month across the whole firm.
  const months = new Map<string, { income: number; expense: number }>();
  for (const t of approved) {
    const key = monthKey(t.txnDate);
    const bucket = months.get(key) ?? { income: 0, expense: 0 };
    if (t.txnType === "INCOME") bucket.income += Number(t.amount);
    else bucket.expense += Number(t.amount);
    months.set(key, bucket);
  }
  const monthRows = Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v, net: v.income - v.expense }));

  const totalIncome = approved
    .filter((t: Txn) => t.txnType === "INCOME")
    .reduce((sum: number, t: Txn) => sum + Number(t.amount), 0);
  const totalExpense = approved
    .filter((t: Txn) => t.txnType === "EXPENSE")
    .reduce((sum: number, t: Txn) => sum + Number(t.amount), 0);

  // Cash movement — a genuine, real number given what QuickBooks
  // entity types we ingest: Deposits/SalesReceipts are direct bank
  // cash-in, Purchases are direct bank cash-out. Bills and Invoices
  // are excluded here since they represent money owed, not yet
  // necessarily collected or paid — so this is cash movement, not a
  // full accrual P&L, and not a substitute for a real cash flow
  // statement (which would also need beginning/ending balances).
  const cashTxnTypes = new Set(["Deposit", "SalesReceipt", "Purchase"]);
  const cashIn = approved
    .filter((t: Txn) => t.txnType === "INCOME")
    .reduce((sum: number, t: Txn) => sum + Number(t.amount), 0);
  const cashOut = approved
    .filter((t: Txn) => t.txnType === "EXPENSE")
    .reduce((sum: number, t: Txn) => sum + Number(t.amount), 0);

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Financial Reports</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Real income and expense totals from approved, closed transactions only — nothing
            still pending review is counted here.
          </p>
        </div>

        <div className="px-8 py-5 max-w-3xl">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B675E] mb-2">
            Profit &amp; Loss — firm-wide, by month
          </h2>
          {monthRows.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-4 mb-6">
              No approved transactions yet — nothing has cleared review.
            </div>
          ) : (
            <table className="w-full text-[13px] mb-6">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-wide text-[#6B675E] border-b border-line">
                  <th className="pb-2 font-medium">Month</th>
                  <th className="pb-2 font-medium">Income</th>
                  <th className="pb-2 font-medium">Expenses</th>
                  <th className="pb-2 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {monthRows.map((m) => (
                  <tr key={m.month} className="border-b border-line">
                    <td className="py-2 font-medium">{m.month}</td>
                    <td className="py-2 font-mono text-teal">${m.income.toLocaleString()}</td>
                    <td className="py-2 font-mono text-rust">${m.expense.toLocaleString()}</td>
                    <td className={`py-2 font-mono font-semibold ${m.net >= 0 ? "text-teal" : "text-rust"}`}>
                      ${m.net.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-2 font-semibold">Total</td>
                  <td className="pt-2 font-mono font-semibold text-teal">${totalIncome.toLocaleString()}</td>
                  <td className="pt-2 font-mono font-semibold text-rust">${totalExpense.toLocaleString()}</td>
                  <td className={`pt-2 font-mono font-semibold ${totalIncome - totalExpense >= 0 ? "text-teal" : "text-rust"}`}>
                    ${(totalIncome - totalExpense).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B675E] mb-2">
            Cash movement (deposits &amp; sales receipts in, purchases out)
          </h2>
          <div className="grid grid-cols-3 border border-line rounded-sm mb-2">
            <div className="px-5 py-4 border-r border-line">
              <div className="font-mono text-[20px] font-medium text-teal">${cashIn.toLocaleString()}</div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">cash in</div>
            </div>
            <div className="px-5 py-4 border-r border-line">
              <div className="font-mono text-[20px] font-medium text-rust">${cashOut.toLocaleString()}</div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">cash out</div>
            </div>
            <div className="px-5 py-4">
              <div className="font-mono text-[20px] font-medium">${(cashIn - cashOut).toLocaleString()}</div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">net movement</div>
            </div>
          </div>
          <p className="text-[11.5px] text-[#6B675E] mb-6">
            This is cash movement from approved transactions, not a full GAAP cash flow
            statement — it doesn't account for beginning/ending balances or financing activity.
          </p>

          <div className="bg-brassSoft border-l-[3px] border-l-brass px-4 py-3 text-[12.5px]">
            A true balance sheet and AR/AP aging report aren't built yet — both need account-type
            classification (asset/liability/equity) and invoice due-date/balance tracking that
            don't exist in the system today. That's a real, separate scoping conversation rather
            than something to approximate here.
          </div>
        </div>
      </div>
    </div>
  );
}
