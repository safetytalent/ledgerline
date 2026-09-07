import SideNav from "@/components/nav/SideNav";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NetworkScorecardPage() {
  const locations = await prisma.location.findMany({
    include: {
      clients: {
        include: {
          subscription: true,
          _count: { select: { transactions: true } },
          transactions: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  type Loc = (typeof locations)[number];

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Network Scorecard</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Real per-location performance — becomes more useful as more locations come online
          </p>
        </div>
        <div className="px-8 py-5">
          <table className="w-full text-[13px] max-w-3xl">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-[#6B675E] border-b border-line">
                <th className="pb-2 font-medium">Location</th>
                <th className="pb-2 font-medium">Clients</th>
                <th className="pb-2 font-medium">Active subscriptions</th>
                <th className="pb-2 font-medium">Transactions on file</th>
                <th className="pb-2 font-medium">Auto-post rate</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc: Loc) => {
                const allTxns = loc.clients.flatMap((c: (typeof loc.clients)[number]) => c.transactions);
                const autoCount = allTxns.filter((t: (typeof allTxns)[number]) => t.status === "AUTO_POSTED").length;
                const rate = allTxns.length > 0 ? ((autoCount / allTxns.length) * 100).toFixed(1) : "0.0";
                const activeSubs = loc.clients.filter(
                  (c: (typeof loc.clients)[number]) => c.subscription?.status === "active"
                ).length;

                return (
                  <tr key={loc.id} className="border-b border-line">
                    <td className="py-2.5 font-medium">
                      {loc.name}
                      {loc.territory && (
                        <span className="text-[11px] text-[#6B675E] ml-1.5">{loc.territory}</span>
                      )}
                    </td>
                    <td className="py-2.5 font-mono">{loc.clients.length}</td>
                    <td className="py-2.5 font-mono">{activeSubs}</td>
                    <td className="py-2.5 font-mono">{allTxns.length}</td>
                    <td className="py-2.5 font-mono">{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
