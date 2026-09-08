import SideNav from "@/components/nav/SideNav";
import DocumentsLibrary, { FieldRow, RegisterItem, TrailStep } from "@/components/documents/DocumentsLibrary";
import { prisma } from "@/lib/db";
import { ensureTemplatesSeeded, ensureFormInstance } from "@/lib/agents/forms-agent";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  CLIENT_ONBOARDING: "Client Onboarding",
  IRS_OFFICIAL: "IRS & Official Tax Forms",
  BUSINESS_DOCUMENTS: "Business Documents",
  INTERNAL_COMPLIANCE: "Internal & Compliance",
};

// Templates whose real nature requires a client's own e-signature —
// matches the register's "CLIENT SIGNATURE REQUIRED" badge from the
// original design.
const SIGNATURE_REQUIRED = new Set(["Form 8879", "Form 2848"]);
const WAITING_ON_CONTRACTOR = new Set(["Form W-9 Request"]);

export default async function DocumentLibraryPage({
  searchParams,
}: {
  searchParams: { client?: string; category?: string; item?: string };
}) {
  await ensureTemplatesSeeded();

  const clients = await prisma.client.findMany({ orderBy: { createdAt: "asc" } });
  if (clients.length === 0) {
    return (
      <div className="grid grid-cols-[216px_1fr] h-screen">
        <SideNav />
        <div className="p-8 text-[13px] text-[#6B675E]">No clients yet.</div>
      </div>
    );
  }

  const selectedClientId = searchParams.client ?? clients[0].id;
  const selectedClient = clients.find((c: (typeof clients)[number]) => c.id === selectedClientId) ?? clients[0];
  const selectedCategoryKey = searchParams.category ?? "IRS_OFFICIAL";

  const allTemplates = await prisma.formTemplate.findMany({ orderBy: { name: "asc" } });
  const categories = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    key,
    label,
    count: allTemplates.filter((t: (typeof allTemplates)[number]) => t.category === key).length,
  }));

  const templatesInCategory = allTemplates.filter((t: (typeof allTemplates)[number]) => t.category === selectedCategoryKey);
  const taxYear = String(new Date().getFullYear());

  const register: RegisterItem[] = [];
  for (const t of templatesInCategory) {
    const instance = await ensureFormInstance(selectedClient.id, t.name, taxYear);
    register.push({
      id: instance.id,
      name: t.name,
      meta: t.description ?? "",
      status: SIGNATURE_REQUIRED.has(t.name) ? "signature" : WAITING_ON_CONTRACTOR.has(t.name) ? "waiting" : "ready",
    });
  }

  const selectedRegisterId = searchParams.item ?? register[0]?.id ?? "";
  const selectedInstance = selectedRegisterId
    ? await prisma.formInstance.findUnique({ where: { id: selectedRegisterId }, include: { template: true } })
    : null;

  const fields: FieldRow[] = (selectedInstance?.fieldsData as unknown as FieldRow[]) ?? [];

  const approvals = selectedInstance
    ? await prisma.approval.findMany({ where: { recordId: selectedInstance.id } })
    : [];
  const preparerReviewed = approvals.some((a: (typeof approvals)[number]) => a.actionType === "PREPARER_REVIEW");
  const clientSigned = approvals.some((a: (typeof approvals)[number]) => a.actionType === "ESIGN");
  const filed = approvals.some((a: (typeof approvals)[number]) => a.actionType === "EFILE");

  const trail: TrailStep[] = [
    { label: "Drafted", note: "Auto-filled from books", stage: "done" },
    {
      label: "Preparer Review",
      note: preparerReviewed ? "Reviewed" : "Waiting on review",
      stage: preparerReviewed ? "done" : "current",
    },
    {
      label: "Client Signature",
      note: clientSigned ? "Signed" : "Via e-signature",
      stage: clientSigned ? "done" : "upcoming",
    },
    { label: "Filed with IRS", note: "Human-approved only", stage: filed ? "done" : "upcoming" },
  ];

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <DocumentsLibrary
        clients={clients.map((c: (typeof clients)[number]) => ({ id: c.id, name: c.name }))}
        selectedClientId={selectedClient.id}
        selectedClientName={selectedClient.name}
        categories={categories}
        selectedCategoryKey={selectedCategoryKey}
        selectedCategoryLabel={CATEGORY_LABELS[selectedCategoryKey] ?? selectedCategoryKey}
        register={register}
        selectedRegisterId={selectedRegisterId}
        selectedName={selectedInstance?.template.name ?? ""}
        fields={fields}
        trail={trail}
        canRequestSignature={preparerReviewed}
        canFile={clientSigned}
        formInstanceId={selectedInstance?.id ?? null}
      />
    </div>
  );
}
