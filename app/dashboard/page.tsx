import SideNav from "@/components/nav/SideNav";
import KpiStrip from "@/components/kpi/KpiStrip";
import ReviewQueue from "@/components/queue/ReviewQueue";
import AgentActivityPanel from "@/components/agent/AgentActivityPanel";

// Without this, Next.js treats this page as static (no per-request
// data source detected at build time) and serves a frozen snapshot
// from whatever the database looked like when it was last built.
export const dynamic = "force-dynamic";


export default function DashboardPage() {
  return (
    <div className="grid grid-cols-[216px_1fr_300px] h-screen">
      <SideNav />

      <div className="overflow-y-auto border-r border-line">
        <div className="flex justify-between items-end px-8 py-6 border-b border-line">
          <div>
            <h1 className="font-display text-[26px] font-medium mb-1">Review Queue</h1>
            <p className="text-[13px] text-[#6B675E] m-0">
              Transactions the agent flagged below your auto-post threshold
            </p>
          </div>
          <div className="flex items-center gap-2 bg-paper2 border border-line px-3 py-1.5 rounded-sm text-[12.5px]">
            <span className="w-1.5 h-1.5 bg-teal rounded-full" />
            All clients
          </div>
        </div>

        <KpiStrip />
        <ReviewQueue />
      </div>

      <AgentActivityPanel />
    </div>
  );
}
