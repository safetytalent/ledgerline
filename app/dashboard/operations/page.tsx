import SideNav from "@/components/nav/SideNav";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Phase D, CEO/Operations Agent v1: a supervisor over the agents
// built so far. This page never touches client books, never
// approves or rejects anything, and never changes a confidence
// threshold — it only rolls up and surfaces information for a
// human to act on elsewhere (the Work Queue, per-client dashboard).
const SLA_HOURS = 24;

export default async function OperationsPage() {
  const openItems = await prisma.transaction.findMany({
    where: { reviewStatus: "PENDING_REVIEW" },
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const now = Date.now();
  const ageHours = (d: Date) => (now - d.getTime()) / (60 * 60 * 1000);

  type Txn = (typeof openItems)[number];
  const overdue = openItems.filter((t: Txn) => ageHours(t.createdAt) > SLA_HOURS);
  const withinSla = openItems.length - overdue.length;
  const avgAgeHours =
    openItems.length > 0
      ? openItems.reduce((sum: number, t: Txn) => sum + ageHours(t.createdAt), 0) / openItems.length
      : 0;

  // Exception queue rollup by client — a firm-wide view, not a
  // per-client work list.
  const byClient = new Map<string, { name: string; open: number; overdue: number }>();
  for (const t of openItems) {
    const existing = byClient.get(t.clientId) ?? { name: t.client.name, open: 0, overdue: 0 };
    existing.open++;
    if (ageHours(t.createdAt) > SLA_HOURS) existing.overdue++;
    byClient.set(t.clientId, existing);
  }
  const clientRollup = Array.from(byClient.values()).sort((a, b) => b.overdue - a.overdue);

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Operations Overview</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Firm-wide exception rollup and SLA tracking — read-only. This surfaces what needs
            attention; it never approves, rejects, or changes anything itself.
          </p>
        </div>

        <div className="px-8 py-5 max-w-3xl">
          <div className="grid grid-cols-4 border border-line rounded-sm mb-6">
            <div className="px-5 py-4 border-r border-line">
              <div className="font-mono text-[20px] font-medium">{openItems.length}</div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">open across all clients</div>
            </div>
            <div className="px-5 py-4 border-r border-line">
              <div className="font-mono text-[20px] font-medium text-teal">{withinSla}</div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">within {SLA_HOURS}h SLA</div>
            </div>
            <div className="px-5 py-4 border-r border-line">
              <div className={`font-mono text-[20px] font-medium ${overdue.length > 0 ? "text-rust" : ""}`}>
                {overdue.length}
              </div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">over {SLA_HOURS}h SLA</div>
            </div>
            <div className="px-5 py-4">
              <div className="font-mono text-[20px] font-medium">{avgAgeHours.toFixed(1)}h</div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">average age</div>
            </div>
          </div>

          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B675E] mb-2">
            Exception rollup by client
          </h2>
          {clientRollup.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-4 mb-6">Nothing open right now.</div>
          ) : (
            <table className="w-full text-[13px] mb-6">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-wide text-[#6B675E] border-b border-line">
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Open items</th>
                  <th className="pb-2 font-medium">Over SLA</th>
                </tr>
              </thead>
              <tbody>
                {clientRollup.map((c) => (
                  <tr key={c.name} className="border-b border-line">
                    <td className="py-2 font-medium">{c.name}</td>
                    <td className="py-2 font-mono">{c.open}</td>
                    <td className={`py-2 font-mono ${c.overdue > 0 ? "text-rust font-semibold" : ""}`}>
                      {c.overdue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B675E] mb-2">
            Over SLA — needs attention
          </h2>
          {overdue.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-4">Nothing over SLA right now.</div>
          ) : (
            overdue.map((t: Txn) => (
              <div
                key={t.id}
                className="bg-white border border-line border-l-[3px] border-l-rust p-4 mb-2.5"
              >
                <div className="font-semibold text-[14px] mb-1">
                  {t.client.name} — {t.vendorName}
                </div>
                <div className="text-[12.5px] text-[#6B675E]">
                  ${Number(t.amount).toLocaleString()} — open {ageHours(t.createdAt).toFixed(1)}h
                  (SLA is {SLA_HOURS}h). Resolve from the Work Queue or the client's own page.
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
