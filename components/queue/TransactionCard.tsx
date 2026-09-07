import { AgentTransaction } from "@/lib/agents/types";

export default function TransactionCard({ txn }: { txn: AgentTransaction }) {
  const isHighConfidence = txn.confidence >= 85;

  return (
    <div
      className={`bg-white border border-line p-4 mb-2.5 flex justify-between gap-4 ${
        isHighConfidence ? "border-l-[3px] border-l-teal" : "border-l-[3px] border-l-brass"
      }`}
    >
      <div className="flex-1">
        <div className="flex gap-2.5 items-baseline mb-1">
          <span className="font-semibold text-[14px]">{txn.vendorName}</span>
          <span className="font-mono text-[13.5px] text-[#6B675E]">
            ${txn.amount.toLocaleString()} · {txn.txnDate}
          </span>
        </div>
        <div className="text-[12.5px] text-[#6B675E] leading-relaxed max-w-[520px]">
          {txn.reasoning}
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="w-[90px] h-1 bg-paper2 rounded overflow-hidden">
            <div
              className={`h-full ${isHighConfidence ? "bg-teal" : "bg-brass"}`}
              style={{ width: `${txn.confidence}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-[#6B675E]">{txn.confidence}% confidence</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[110px]">
        {isHighConfidence ? (
          <button className="border border-line bg-white text-[#6B675E] text-[12.5px] px-3 py-1.5 rounded-sm text-left">
            Looks right
          </button>
        ) : (
          <>
            <button className="bg-ink text-white text-[12.5px] font-medium px-3 py-1.5 rounded-sm text-left">
              Confirm {txn.suggestedCategory}
            </button>
            <button className="border border-line bg-white text-[12.5px] font-medium px-3 py-1.5 rounded-sm text-left">
              Recode
            </button>
            <button className="text-[#6B675E] text-[12.5px] px-3 py-1.5 rounded-sm text-left">
              Ask client
            </button>
          </>
        )}
      </div>
    </div>
  );
}
