import { AgentTransaction } from "@/lib/agents/types";
import TransactionCard from "./TransactionCard";

// Phase 1: replace this with a real fetch from the `Transaction` table
// (status = PENDING, ordered by confidence ascending).
const SAMPLE_TRANSACTIONS: AgentTransaction[] = [
  {
    id: "1",
    vendorName: "Gulf Coast Equipment Rental",
    amount: 4280,
    txnDate: "Sep 3",
    suggestedCategory: "Job 4412",
    confidence: 41,
    reasoning:
      "First transaction from this vendor for Sierra Construction. Similar amount/timing to prior \"Job 4412 — Equipment\" entries, but no PO on file to confirm.",
    status: "PENDING",
    autoPosted: false,
  },
  {
    id: "2",
    vendorName: "IRS — Estimated Payment",
    amount: 12500,
    txnDate: "Sep 2",
    suggestedCategory: "Estimated Tax Payment",
    confidence: 58,
    reasoning:
      "Amount is 30% higher than this client's typical quarterly estimate. Flagged for confirmation rather than auto-post.",
    status: "PENDING",
    autoPosted: false,
  },
  {
    id: "3",
    vendorName: "Amy Chance — Payroll Draw",
    amount: 3100,
    txnDate: "Sep 1",
    suggestedCategory: "Payroll",
    confidence: 97,
    reasoning: "Matches recurring bi-weekly pattern exactly. Auto-posted; shown here for spot-check only.",
    status: "AUTO_POSTED",
    autoPosted: true,
  },
];

export default function ReviewQueue() {
  return (
    <div className="px-8 py-5">
      <div className="flex justify-between items-center mb-3.5">
        <h2 className="text-[15px] font-semibold">Needs your call</h2>
        <span className="text-[12px] text-[#6B675E]">Sorted by confidence, lowest first</span>
      </div>
      {SAMPLE_TRANSACTIONS.map((txn) => (
        <TransactionCard key={txn.id} txn={txn} />
      ))}
    </div>
  );
}
