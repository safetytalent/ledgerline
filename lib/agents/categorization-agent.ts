import { AgentTransaction, CorrectionMemoryEntry } from "./types";

const AUTO_POST_THRESHOLD = Number(process.env.AUTO_POST_CONFIDENCE_THRESHOLD ?? 85);

/**
 * Categorization Agent — Phase 1
 *
 * Order of operations for every incoming transaction:
 *  1. Check correction_memory for this client+vendor — if found, use it
 *     and set confidence high (this is the "learning" mechanism).
 *  2. Fall back to rules engine (recurring-amount matching, vendor-name
 *     heuristics) for anything not yet in memory.
 *  3. Anything still under threshold goes to the review queue instead of
 *     auto-posting. Never guess silently above the threshold on a vendor
 *     the agent hasn't actually seen confirmed before.
 *
 * This file is intentionally simple in Phase 1 — no LLM call here.
 * Phase 3 adds an LLM fallback for genuinely novel vendors, gated by the
 * same threshold check so it can never silently auto-post either.
 */
export async function categorizeTransaction(
  clientId: string,
  vendorName: string,
  amount: number,
  lookupMemory: (clientId: string, vendorName: string) => Promise<CorrectionMemoryEntry | null>
): Promise<Pick<AgentTransaction, "suggestedCategory" | "confidence" | "reasoning">> {
  const memory = await lookupMemory(clientId, vendorName);

  if (memory && memory.timesConfirmed >= 2) {
    return {
      suggestedCategory: memory.jobOrCostCode
        ? `${memory.correctCategory} — ${memory.jobOrCostCode}`
        : memory.correctCategory,
      confidence: Math.min(99, 80 + memory.timesConfirmed * 4),
      reasoning: `Matches ${memory.timesConfirmed} prior confirmed codings for this vendor on this client.`,
    };
  }

  if (memory && memory.timesConfirmed === 1) {
    return {
      suggestedCategory: memory.correctCategory,
      confidence: 60,
      reasoning: `Corrected once before to this category — confirming again will lock it in for auto-posting.`,
    };
  }

  // No memory yet — placeholder for the rules engine (recurring amount
  // detection, vendor-name keyword matching, etc.)
  return {
    suggestedCategory: "Uncategorized",
    confidence: 30,
    reasoning: `First time seeing this vendor for this client — no rule or memory match yet.`,
  };
}

export function meetsAutoPostThreshold(confidence: number): boolean {
  return confidence >= AUTO_POST_THRESHOLD;
}
