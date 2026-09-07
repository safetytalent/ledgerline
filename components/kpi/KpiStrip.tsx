import { prisma } from "@/lib/db";

export default async function KpiStrip() {
  const [pendingCount, totalCount, autoPostedCount] = await Promise.all([
    prisma.transaction.count({ where: { status: "PENDING" } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { autoPosted: true } }),
  ]);

  const autoRate = totalCount > 0 ? ((autoPostedCount / totalCount) * 100).toFixed(1) : "0.0";

  const KPIS = [
    { num: `${autoRate}%`, label: "auto-categorized this week" },
    { num: String(pendingCount), label: "awaiting your review" },
    { num: "2.1 min", label: "avg. time to clear a queue item" },
    { num: "$0", label: "miscoded $ found this month" },
  ];

  return (
    <div className="grid grid-cols-4 border-b border-line">
      {KPIS.map((k, i) => (
        <div key={k.label} className={`px-6 py-4 ${i < KPIS.length - 1 ? "border-r border-line" : ""}`}>
          <div className="font-mono text-[22px] font-medium">{k.num}</div>
          <div className="text-[11.5px] text-[#6B675E] mt-0.5">{k.label}</div>
        </div>
      ))}
    </div>
  );
}
