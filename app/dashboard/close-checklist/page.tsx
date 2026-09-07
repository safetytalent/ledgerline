import SideNav from "@/components/nav/SideNav";
import CloseChecklistRow from "@/components/close/CloseChecklistRow";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Straight from the firm's "Monthly Financial Close" service line.
const CLOSE_TASKS = [
  "Complete bank/credit-card reconciliations",
  "Review AR, AP and payroll liabilities",
  "Review loans, fixed assets, prepaids and accruals",
  "Review inventory/intercompany/equity accounts when applicable",
  "Investigate unusual balances",
  "Review P&L and balance-sheet accounts",
  "Post adjusting entries",
  "Lock/close accounting period",
];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CloseChecklistPage() {
  const month = currentMonth();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const clients = await prisma.client.findMany({
    include: {
      closeTasks: { where: { month } },
      transactions: { select: { amount: true, txnDate: true, suggestedCategory: true, reviewStatus: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Close Checklist</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Monthly close tasks for {month} — checked off per client, saved for real
          </p>
        </div>

        <div className="px-8 py-5">
          {clients.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-8 text-center">No clients yet.</div>
          ) : (
            clients.map((c: (typeof clients)[number]) => {
              const doneCount = c.closeTasks.filter((t: (typeof c.closeTasks)[number]) => t.done).length;

              // Phase C, Close Checklist Agent: flag unusual balance
              // swings and unreviewed suspense accounts automatically —
              // real numbers computed from this client's own history.
              type ClientTxn = (typeof c.transactions)[number];
              const thisMonthTotal = c.transactions
                .filter((t: ClientTxn) => t.txnDate >= monthStart)
                .reduce((sum: number, t: ClientTxn) => sum + Number(t.amount), 0);
              const prevMonthTotal = c.transactions
                .filter((t: ClientTxn) => t.txnDate >= prevMonthStart && t.txnDate < monthStart)
                .reduce((sum: number, t: ClientTxn) => sum + Number(t.amount), 0);
              const swingPct =
                prevMonthTotal > 0 ? ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;
              const hasUnusualSwing = prevMonthTotal > 0 && Math.abs(swingPct) >= 50;

              const suspenseItems = c.transactions.filter(
                (t: ClientTxn) => t.suggestedCategory === "Uncategorized" && t.reviewStatus === "PENDING_REVIEW"
              );

              return (
                <div key={c.id} className="mb-6 max-w-xl">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-[15px] font-semibold">{c.name}</h2>
                    <span className="text-[12px] text-[#6B675E] font-mono">
                      {doneCount}/{CLOSE_TASKS.length}
                    </span>
                  </div>

                  {(hasUnusualSwing || suspenseItems.length > 0) && (
                    <div className="mb-2 space-y-1.5">
                      {hasUnusualSwing && (
                        <div className="bg-brassSoft border-l-[3px] border-l-brass px-3 py-2 text-[12.5px]">
                          Unusual balance swing: this month's volume is{" "}
                          {swingPct > 0 ? "up" : "down"} {Math.abs(swingPct).toFixed(0)}% vs last month
                          (${thisMonthTotal.toLocaleString()} vs ${prevMonthTotal.toLocaleString()}).
                        </div>
                      )}
                      {suspenseItems.length > 0 && (
                        <div className="bg-brassSoft border-l-[3px] border-l-brass px-3 py-2 text-[12.5px]">
                          {suspenseItems.length} uncategorized transaction
                          {suspenseItems.length === 1 ? "" : "s"} still unreviewed.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-white border border-line rounded-sm px-4">
                    {CLOSE_TASKS.map((task) => {
                      const existing = c.closeTasks.find(
                        (t: (typeof c.closeTasks)[number]) => t.taskLabel === task
                      );
                      return (
                        <CloseChecklistRow
                          key={task}
                          clientId={c.id}
                          month={month}
                          taskLabel={task}
                          done={existing?.done ?? false}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
