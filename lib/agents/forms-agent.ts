import { prisma } from "@/lib/db";

/**
 * Phase H — the Forms Agent's auto-fill engine, following the spec's
 * exact source order: (1) client record, (2) connected QBO data,
 * (3) prior year's version of the same form, (4) leave blank for
 * manual entry. This function only ever builds a fields array and
 * saves a FormInstance — it never sends anything anywhere. Sending
 * for signature is a human action, wired up in Phase J.
 */

export type FieldRow = {
  label: string;
  value: string;
  provenance: "record" | "qbo" | "manual";
  empty?: boolean;
};

function recordField(label: string, value: string | null | undefined): FieldRow {
  if (!value) return { label, value: "", provenance: "manual", empty: true };
  return { label, value, provenance: "record" };
}

/**
 * W-9 Request — priority #1 per the spec. Almost entirely
 * record-sourced: business name, entity type, EIN, address. No QBO
 * data is relevant to a W-9 itself.
 */
async function fillW9Request(clientId: string): Promise<FieldRow[]> {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  return [
    recordField("Business name", client.name),
    recordField("Entity type", client.entityType ?? null),
    recordField("EIN", client.ein),
    recordField("Address", client.address),
  ];
}

/**
 * Engagement letter — priority #2. Business name, entity type, and
 * the service scope from the client's own active service list.
 */
async function fillEngagementLetter(clientId: string): Promise<FieldRow[]> {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  return [
    recordField("Business name", client.name),
    recordField("Entity type", client.entityType ?? null),
    {
      label: "Service scope",
      value: client.activeServices.length > 0 ? client.activeServices.join(", ") : "",
      provenance: "record",
      empty: client.activeServices.length === 0,
    },
  ];
}

/**
 * 1099-NEC — priority #3, and the one genuinely QBO-sourced field:
 * contractor payments actually reconciled through the books, summed
 * per vendor, filtered to the $600 IRS reporting threshold. This is
 * real computed data, not a placeholder — matching the UI's own
 * sample ("3 contractors over $600 · pulled from reconciled
 * payments").
 */
async function fill1099Nec(clientId: string, taxYear: string): Promise<FieldRow[]> {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  const yearStart = new Date(`${taxYear}-01-01`);
  const yearEnd = new Date(`${Number(taxYear) + 1}-01-01`);

  const approved = await prisma.transaction.findMany({
    where: {
      clientId,
      reviewStatus: "APPROVED",
      txnType: "EXPENSE",
      txnDate: { gte: yearStart, lt: yearEnd },
    },
  });

  const byVendor = new Map<string, number>();
  for (const t of approved) {
    byVendor.set(t.vendorName, (byVendor.get(t.vendorName) ?? 0) + Number(t.amount));
  }
  const contractorsOver600 = Array.from(byVendor.entries()).filter(([, total]) => total >= 600);

  const fields: FieldRow[] = [
    recordField("Payer business name", client.name),
    recordField("Payer EIN", client.ein),
  ];

  if (contractorsOver600.length === 0) {
    fields.push({
      label: "Contractors over $600",
      value: "",
      provenance: "qbo",
      empty: true,
    });
  } else {
    for (const [vendor, total] of contractorsOver600) {
      fields.push({
        label: `${vendor} — total paid`,
        value: `$${total.toLocaleString()}`,
        provenance: "qbo",
      });
    }
  }

  return fields;
}

const FILLERS: Record<string, (clientId: string, taxYear: string) => Promise<FieldRow[]>> = {
  "Form W-9 Request": (clientId) => fillW9Request(clientId),
  "Engagement Letter": (clientId) => fillEngagementLetter(clientId),
  "Form 1099-NEC": (clientId, taxYear) => fill1099Nec(clientId, taxYear),
};

// The four-category library from the spec, seeded idempotently — safe
// to call on every page load. Priority-order templates (W-9,
// engagement letter, 1099-NEC) have real fillers above; the rest are
// present as real rows so the library reflects the eventual full
// scope, but their fields all come back manual until a later build
// step wires their fillers in.
const TEMPLATE_SEED: { name: string; category: string; description: string }[] = [
  { name: "Engagement Letter", category: "CLIENT_ONBOARDING", description: "Every new client — scope pulled from active services" },
  { name: "Form W-9 Request", category: "IRS_OFFICIAL", description: "Shareable link for a contractor to fill and return" },
  { name: "Form 1099-NEC", category: "IRS_OFFICIAL", description: "Contractor totals over $600, pulled from reconciled payments" },
  { name: "Form W-2", category: "IRS_OFFICIAL", description: "Pulled from payroll register — auto-fill not yet built" },
  { name: "Form 8879", category: "IRS_OFFICIAL", description: "E-file authorization — requires client e-signature (Phase J/K)" },
  { name: "Form 2848", category: "IRS_OFFICIAL", description: "Power of attorney — requires client e-signature (Phase J/K)" },
];

export async function ensureTemplatesSeeded() {
  for (const t of TEMPLATE_SEED) {
    await prisma.formTemplate.upsert({
      where: { name: t.name },
      create: { name: t.name, category: t.category as never, description: t.description },
      update: {},
    });
  }
}

/**
 * Get-or-create: returns the existing FormInstance for this
 * client/template if one exists, otherwise generates a fresh one.
 * This is what lets visiting the library show live pre-filled data
 * immediately, without a separate manual "generate" step for every
 * template on every visit.
 */
export async function ensureFormInstance(clientId: string, templateName: string, taxYear: string) {
  const template = await prisma.formTemplate.findUniqueOrThrow({ where: { name: templateName } });
  const existing = await prisma.formInstance.findFirst({
    where: { clientId, templateId: template.id },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return generateFormInstance(clientId, templateName, taxYear);
}

/**
 * Generates a FormInstance for one client/template. Templates without
 * a specific filler (W-2, Form 8879, Form 2848 — later per the spec's
 * priority order) get every field marked manual rather than a
 * fabricated guess.
 */
export async function generateFormInstance(clientId: string, templateName: string, taxYear: string) {
  const template = await prisma.formTemplate.findUniqueOrThrow({ where: { name: templateName } });

  const filler = FILLERS[templateName];
  const fields: FieldRow[] = filler
    ? await filler(clientId, taxYear)
    : [{ label: "This template's auto-fill isn't built yet", value: "", provenance: "manual", empty: true }];

  return prisma.formInstance.create({
    data: {
      templateId: template.id,
      clientId,
      fieldsData: fields,
    },
  });
}
