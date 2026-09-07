import SideNav from "@/components/nav/SideNav";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function KpiDashboardsPage() {
  const [byClient, statusCounts, totalAmount] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["clientId"],
      _count: { _all: true },
      _avg: { confidenceScore: true },
    }),
    prisma.transaction.groupBy({
      by: ["reviewStatus"],
      _count: { _all: true },
    }),
    prisma.transaction.aggregate({ _sum: { amount: true } }),
  ]);

  const clients = await prisma.client.findMany({
    where: { id: { in: byClient.map((c: (typeof byClient)[number]) => c.clientId) } },
    select: { id: true, name: true },
  });
  const clientName = (id: string) => clients.find((c: (typeof clients)[number]) => c.id === id)?.name ?? id;

  const totalTxns = statusCounts.reduce((sum: number, s: (typeof statusCounts)[number]) => sum + s._count._all, 0);
  const autoPosted = statusCounts.find((s: (typeof statusCounts)[number]) => s.reviewStatus === "AUTO_POSTED")?._count._all ?? 0;
  const autoRate = totalTxns > 0 ? ((autoPosted / totalTxns) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">KPI Dashboards</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Real numbers computed from every transaction on file
          </p>
        </div>

        <div className="grid grid-cols-4 border-b border-line">
          <div className="px-6 py-4 border-r border-line">
            <div className="font-mono text-[22px] font-medium">{totalTxns}</div>
            <div className="text-[11.5px] text-[#6B675E] mt-0.5">total transactions</div>
          </div>
          <div className="px-6 py-4 border-r border-line">
            <div className="font-mono text-[22px] font-medium">{autoRate}%</div>
            <div className="text-[11.5px] text-[#6B675E] mt-0.5">auto-posted rate</div>
          </div>
          <div className="px-6 py-4 border-r border-line">
            <div className="font-mono text-[22px] font-medium">
              ${Number(totalAmount._sum.amount ?? 0).toLocaleString()}
            </div>
            <div className="text-[11.5px] text-[#6B675E] mt-0.5">total dollar volume</div>
          </div>
          <div className="px-6 py-4">
            <div className="font-mono text-[22px] font-medium">{clients.length}</div>
            <div className="text-[11.5px] text-[#6B675E] mt-0.5">active clients</div>
          </div>
        </div>

        <div className="px-8 py-5">
          <h2 className="text-[15px] font-semibold mb-3">By client</h2>
          <table className="w-full text-[13px] max-w-2xl">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-[#6B675E] border-b border-line">
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium">Transactions</th>
                <th className="pb-2 font-medium">Avg. confidence score</th>
              </tr>
            </thead>
            <tbody>
              {byClient.map((c: (typeof byClient)[number]) => (
                <tr key={c.clientId} className="border-b border-line">
                  <td className="py-2.5 font-medium">{clientName(c.clientId)}</td>
                  <td className="py-2.5 font-mono">{c._count._all}</td>
                  <td className="py-2.5 font-mono">
                    {c._avg.confidenceScore ? Math.round(c._avg.confidenceScore) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
