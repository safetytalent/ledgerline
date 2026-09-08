import { prisma } from "@/lib/db";

/**
 * AR Nudge Agent — per the CEO/Operations spec: "Draft (never send)
 * collection reminder emails." Every draft this agent produces
 * requires an explicit human send — there is no code path in this
 * app that emails a client on its own.
 */

const AGING_BUCKETS = [
  { label: "Current", minDays: -Infinity, maxDays: 0 },
  { label: "1-30 days", minDays: 1, maxDays: 30 },
  { label: "31-60 days", minDays: 31, maxDays: 60 },
  { label: "61-90 days", minDays: 61, maxDays: 90 },
  { label: "90+ days", minDays: 91, maxDays: Infinity },
];

export function daysOverdue(dueDate: Date): number {
  const diffMs = Date.now() - dueDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function agingBucket(dueDate: Date): string {
  const days = daysOverdue(dueDate);
  const bucket = AGING_BUCKETS.find((b) => days >= b.minDays && days <= b.maxDays);
  return bucket?.label ?? "Current";
}

/**
 * Drafts a reminder for one overdue invoice. Tone scales gently with
 * how overdue it is — per the ops spec's "which tone/timing gets
 * invoices paid" learning goal, though the actual per-client tuning
 * loop isn't built yet; this starts with one reasonable default per
 * aging bucket.
 */
export function draftReminderText(
  customerName: string,
  invoiceAmount: string,
  dueDate: Date
): { subject: string; body: string } {
  const days = daysOverdue(dueDate);
  const bucket = agingBucket(dueDate);

  if (bucket === "Current" || bucket === "1-30 days") {
    return {
      subject: `Friendly reminder — invoice for ${customerName}`,
      body: `Hi ${customerName},\n\nJust a friendly reminder that an invoice for ${invoiceAmount} was due on ${dueDate.toLocaleDateString()}. If you've already sent payment, please disregard this note. Otherwise, let us know if you have any questions.\n\nThank you,`,
    };
  }
  if (bucket === "31-60 days" || bucket === "61-90 days") {
    return {
      subject: `Past due — invoice for ${customerName} (${days} days)`,
      body: `Hi ${customerName},\n\nOur records show an invoice for ${invoiceAmount} is now ${days} days past its due date of ${dueDate.toLocaleDateString()}. Please let us know if there's anything holding up payment, or send payment at your earliest convenience.\n\nThank you,`,
    };
  }
  return {
    subject: `Overdue notice — invoice for ${customerName} (${days} days)`,
    body: `Hi ${customerName},\n\nThis invoice for ${invoiceAmount}, originally due ${dueDate.toLocaleDateString()}, is now ${days} days past due. Please reach out as soon as possible so we can resolve this together.\n\nThank you,`,
  };
}

/**
 * Generates (or reuses) a draft reminder for every open invoice for
 * a client that doesn't already have an un-sent draft on file —
 * never duplicates a pending draft, never sends anything itself.
 */
export async function generateRemindersForClient(clientId: string) {
  const openInvoices = await prisma.invoice.findMany({
    where: { clientId, balance: { gt: 0 } },
    include: { reminders: { where: { status: "DRAFT" } } },
  });

  for (const inv of openInvoices) {
    if (inv.reminders.length > 0) continue; // already has a pending draft
    if (agingBucket(inv.dueDate) === "Current") continue; // not overdue yet

    const { subject, body } = draftReminderText(
      inv.customerName,
      `$${Number(inv.balance).toLocaleString()}`,
      inv.dueDate
    );

    await prisma.arReminderDraft.create({
      data: { invoiceId: inv.id, subject, body },
    });
  }
}
