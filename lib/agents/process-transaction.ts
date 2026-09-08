import { prisma } from "@/lib/db";
import { categorizeTransaction, meetsAutoPostThreshold } from "@/lib/agents/categorization-agent";
import { touchesRuleTwoCategory } from "@/lib/agents/rule2-check";
import { fetchEntityById, extractTransactionFields } from "@/lib/qbo/client";

/**
 * The single, shared pipeline for turning one QuickBooks entity into a
 * categorized, Rule-2-checked, audit-logged Transaction row. Both the
 * webhook (reactive — Intuit tells us something changed) and the pull
 * sync (active — we ask QBO for recent transactions) call this same
 * function, so there's exactly one place that decides "does this
 * auto-post or go to review" — never two copies of that logic that
 * could quietly drift apart.
 *
 * Returns the transaction row, or null if this entity was skipped
 * (QBO fetch failed, or the client has no realm on file).
 */
export async function processQboEntity(
  clientId: string,
  realmId: string,
  accessToken: string,
  entityType: string,
  entityId: string
) {
  let vendorName: string;
  let amount: number;
  let txnDate: Date;
  let txnType: "INCOME" | "EXPENSE";

  try {
    const raw = await fetchEntityById(realmId, accessToken, entityType, entityId);
    if (!raw) return null;
    ({ vendorName, amount, txnDate, txnType } = extractTransactionFields(entityType, raw));
  } catch {
    // If QBO's API call fails for this one entity, skip it rather
    // than saving a fabricated placeholder row.
    return null;
  }

  const lookupMemory = async (cId: string, vendor: string) => {
    const row = await prisma.correctionMemory.findUnique({
      where: { clientId_vendorName: { clientId: cId, vendorName: vendor } },
    });
    if (!row) return null;
    return {
      clientId: row.clientId,
      vendorName: row.vendorName,
      correctCategory: row.correctCategory,
      jobOrCostCode: row.jobOrCostCode ?? undefined,
      timesConfirmed: row.timesConfirmed,
    };
  };

  const result = await categorizeTransaction(clientId, vendorName, amount, lookupMemory);

  // Rule 2, no exceptions: equity, owner draws, loans, payroll
  // liabilities, and tax filings never auto-post, no matter how
  // confident the agent is.
  const autoPost =
    meetsAutoPostThreshold(result.confidence) &&
    !touchesRuleTwoCategory(result.suggestedCategory);

  const txn = await prisma.transaction.upsert({
    where: { qboTxnId: entityId },
    create: {
      clientId,
      qboTxnId: entityId,
      vendorName,
      amount,
      txnDate,
      txnType,
      suggestedCategory: result.suggestedCategory,
      confidenceScore: result.confidence,
      reasoning: result.reasoning,
      reviewStatus: autoPost ? "AUTO_POSTED" : "PENDING_REVIEW",
    },
    update: {
      vendorName,
      amount,
      txnDate,
      suggestedCategory: result.suggestedCategory,
      confidenceScore: result.confidence,
      reasoning: result.reasoning,
    },
  });

  // Phase A: every auto-post is still a logged approval event — the
  // system is the actor, but it's recorded the same way a human
  // approval would be, for the audit trail.
  if (autoPost) {
    await prisma.approval.create({
      data: { userId: "system", actionType: "POST", recordId: txn.id },
    });
  }

  return txn;
}
