import SideNav from "@/components/nav/SideNav";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) === 1 ? "" : "s"} ago`;
}

export default async function AgentActivityPage() {
  const [learned, escalated] = await Promise.all([
    prisma.correctionMemory.findMany({
      orderBy: { lastUsedAt: "desc" },
      take: 15,
      include: { client: { select: { name: true } } },
    }),
    prisma.transaction.findMany({
      where: { status: "ESCALATED" },
      orderBy: { updatedAt: "desc" },
      take: 15,
      include: { client: { select: { name: true } } },
    }),
  ]);

  type Event = { id: string; type: "learned" | "escalated"; text: string; at: Date };

  const events: Event[] = [
    ...learned.map(
      (c: (typeof learned)[number]): Event => ({
        id: `learn-${c.id}`,
        type: "learned",
        text: `${c.client.name}: "${c.vendorName}" → will categorize as "${c.correctCategory}" automatically next time (confirmed ${c.timesConfirmed} time${c.timesConfirmed === 1 ? "" : "s"}).`,
        at: c.lastUsedAt,
      })
    ),
    ...escalated.map(
      (t: (typeof escalated)[number]): Event => ({
        id: `esc-${t.id}`,
        type: "escalated",
        text: `${t.client.name}: "${t.vendorName}" ($${Number(t.amount).toLocaleString()}) sent to client for clarification.`,
        at: t.updatedAt,
      })
    ),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Agent Activity</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Real history of what the agent learned and flagged, across every client
          </p>
        </div>
        <div className="px-8 py-5 max-w-2xl">
          {events.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-8 text-center">
              No agent activity yet — confirm or recode a transaction to see it here.
            </div>
          ) : (
            events.map((e) => (
              <div key={e.id} className="py-3 border-b border-line last:border-none">
                <span
                  className={`font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm inline-block mb-1.5 ${
                    e.type === "learned" ? "bg-tealSoft text-teal" : "bg-brassSoft text-brass"
                  }`}
                >
                  {e.type === "learned" ? "Learned" : "Escalated"}
                </span>
                <div className="text-[13px] leading-relaxed">{e.text}</div>
                <div className="text-[11px] text-[#6B675E] mt-1">{timeAgo(e.at)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
