import { prisma } from "@/lib/db";
import TransactionCard from "./TransactionCard";
import { AgentTransaction } from "@/lib/agents/types";

function formatTxnDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function ReviewQueue() {
  const rows = await prisma.transaction.findMany({
    where: { reviewStatus: { in: ["PENDING_REVIEW", "AUTO_POSTED"] } },
    orderBy: { confidenceScore: "asc" },
    take: 25,
  });

  const transactions: AgentTransaction[] = rows.map((t: (typeof rows)[number]) => ({
    id: t.id,
    vendorName: t.vendorName,
    amount: Number(t.amount),
    txnDate: formatTxnDate(t.txnDate),
    suggestedCategory: t.suggestedCategory ?? "Uncategorized",
    confidence: t.confidenceScore,
    reasoning: t.reasoning ?? "",
    reviewStatus: t.reviewStatus,
    escalatedToClient: t.escalatedToClient,
  }));

  return (
    <div className="px-8 py-5">
      <div className="flex justify-between items-center mb-3.5">
        <h2 className="text-[15px] font-semibold">Needs your call</h2>
        <span className="text-[12px] text-[#6B675E]">Sorted by confidence, lowest first</span>
      </div>
      {transactions.length === 0 ? (
        <div className="text-[13px] text-[#6B675E] py-8 text-center">
          No transactions waiting for review right now.
        </div>
      ) : (
        transactions.map((txn) => <TransactionCard key={txn.id} txn={txn} />)
      )}
    </div>
  );
}
