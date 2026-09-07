"use client";

import { useState, useTransition } from "react";
import { AgentTransaction } from "@/lib/agents/types";
import { confirmTransaction, recodeTransaction, askClient } from "@/app/dashboard/actions";

export default function TransactionCard({ txn }: { txn: AgentTransaction }) {
  const [isPending, startTransition] = useTransition();
  const [recoding, setRecoding] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const isHighConfidence = txn.confidence >= 85;

  // Already acted on this session — the server will remove it from the
  // list on next load, but we hide it immediately for instant feedback.
  const [done, setDone] = useState(false);
  if (done) return null;

  function handleConfirm() {
    startTransition(async () => {
      await confirmTransaction(txn.id);
      setDone(true);
    });
  }

  function handleRecodeSubmit() {
    if (!newCategory.trim()) return;
    startTransition(async () => {
      await recodeTransaction(txn.id, newCategory);
      setDone(true);
    });
  }

  function handleAskClient() {
    startTransition(async () => {
      await askClient(txn.id);
      setDone(true);
    });
  }

  return (
    <div
      className={`bg-white border border-line p-4 mb-2.5 flex justify-between gap-4 ${
        isHighConfidence ? "border-l-[3px] border-l-teal" : "border-l-[3px] border-l-brass"
      } ${isPending ? "opacity-50" : ""}`}
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

        {recoding && (
          <div className="flex items-center gap-1.5 mt-2.5">
            <input
              autoFocus
              type="text"
              placeholder="Correct category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRecodeSubmit()}
              className="border border-line rounded-sm px-2 py-1 text-[12.5px] flex-1 max-w-[220px]"
            />
            <button
              onClick={handleRecodeSubmit}
              disabled={isPending}
              className="bg-ink text-white text-[12px] px-2.5 py-1 rounded-sm"
            >
              Save
            </button>
            <button
              onClick={() => setRecoding(false)}
              className="text-[#6B675E] text-[12px] px-2 py-1"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {!recoding && (
        <div className="flex flex-col gap-1.5 min-w-[110px]">
          {isHighConfidence ? (
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="border border-line bg-white text-[#6B675E] text-[12.5px] px-3 py-1.5 rounded-sm text-left"
            >
              Looks right
            </button>
          ) : (
            <>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="bg-ink text-white text-[12.5px] font-medium px-3 py-1.5 rounded-sm text-left"
              >
                Confirm {txn.suggestedCategory}
              </button>
              <button
                onClick={() => setRecoding(true)}
                disabled={isPending}
                className="border border-line bg-white text-[12.5px] font-medium px-3 py-1.5 rounded-sm text-left"
              >
                Recode
              </button>
              <button
                onClick={handleAskClient}
                disabled={isPending}
                className="text-[#6B675E] text-[12.5px] px-3 py-1.5 rounded-sm text-left"
              >
                Ask client
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
