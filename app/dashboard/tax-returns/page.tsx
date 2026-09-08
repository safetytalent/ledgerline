import SideNav from "@/components/nav/SideNav";
import GenerateDraftForm from "@/components/tax/GenerateDraftForm";
import SignoffButton from "@/components/tax/SignoffButton";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Phase F: workpaper/return-draft agent. Draft totals come from
// approved, reconciled financials only — never from anything still
// pending review. Nothing here files anything; Rule 1 blocks any
// draft from moving past DRAFT until a named preparer explicitly
// signs off, and filing itself (Phase K) is a separate, later gate
// on top of this one.
export default async function TaxReturnsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "asc" },
  });
  const drafts = await prisma.taxReturnDraft.findMany({
    include: { client: { select: { name: true } } },
    orderBy: [{ taxYear: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Tax Return Drafts</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Draft workpaper totals from approved financials only. Nothing here is filed — a
            named preparer must explicitly sign off before a draft goes any further.
          </p>
        </div>

        <div className="px-8 py-5 max-w-3xl">
          <GenerateDraftForm clients={clients.map((c: (typeof clients)[number]) => ({ id: c.id, name: c.name }))} />

          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B675E] mb-2 mt-6">
            Drafts on file
          </h2>
          {drafts.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-4">No drafts generated yet.</div>
          ) : (
            drafts.map((d: (typeof drafts)[number]) => (
              <div key={d.id} className="bg-white border border-line rounded-sm p-4 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-[14px]">
                    {d.client.name} — {d.taxYear}
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${
                      d.status === "PREPARER_APPROVED" ? "bg-tealSoft text-teal" : "bg-brassSoft text-brass"
                    }`}
                  >
                    {d.status === "PREPARER_APPROVED" ? "Preparer approved" : "Draft"}
                  </span>
                </div>
                <div className="text-[12.5px] text-[#6B675E] mb-2">
                  Income ${Number(d.totalIncome).toLocaleString()} — Expenses $
                  {Number(d.totalExpenses).toLocaleString()} — Net $
                  {Number(d.netIncome).toLocaleString()}
                </div>
                {d.status === "PREPARER_APPROVED" ? (
                  <div className="text-[11.5px] text-[#6B675E]">
                    Signed off by {d.preparerApprovedBy} on{" "}
                    {d.preparerApprovedAt?.toLocaleString()}
                  </div>
                ) : (
                  <SignoffButton draftId={d.id} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
