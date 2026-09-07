import SideNav from "@/components/nav/SideNav";
import AgentActivityPanel from "@/components/agent/AgentActivityPanel";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: {
      qboTokens: true,
      subscription: true,
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="grid grid-cols-[216px_1fr_300px] h-screen">
      <SideNav />

      <div className="overflow-y-auto border-r border-line">
        <div className="flex justify-between items-end px-8 py-6 border-b border-line">
          <div>
            <h1 className="font-display text-[26px] font-medium mb-1">Client Books</h1>
            <p className="text-[13px] text-[#6B675E] m-0">
              Every client connected to this account
            </p>
          </div>
        </div>

        <div className="px-8 py-5">
          {clients.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-8 text-center">
              No clients yet.
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-wide text-[#6B675E] border-b border-line">
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">QuickBooks status</th>
                  <th className="pb-2 font-medium">Subscription</th>
                  <th className="pb-2 font-medium">Transactions on file</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c: (typeof clients)[number]) => (
                  <tr key={c.id} className="border-b border-line">
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="py-3">
                      {c.qboTokens ? (
                        <span className="inline-flex items-center gap-1.5 text-teal">
                          <span className="w-1.5 h-1.5 bg-teal rounded-full" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#6B675E]">
                          <span className="w-1.5 h-1.5 bg-[#6B675E] rounded-full" />
                          Not connected
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {c.subscription?.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 text-teal">
                          <span className="w-1.5 h-1.5 bg-teal rounded-full" />
                          Active
                        </span>
                      ) : (
                        <a
                          href={`/api/billing/checkout?clientId=${c.id}`}
                          className="text-brass underline text-[12.5px]"
                        >
                          Start subscription
                        </a>
                      )}
                    </td>
                    <td className="py-3 font-mono">{c._count.transactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
         )}
        </div>
      </div>

      <AgentActivityPanel />
    </div>
  );
}
