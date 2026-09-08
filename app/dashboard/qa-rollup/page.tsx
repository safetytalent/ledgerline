import SideNav from "@/components/nav/SideNav";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Phase G: summarizes LearningLog patterns into proposed rule
// changes for a human to review. This page NEVER auto-applies
// anything — it only counts and groups what's already there, and
// every "proposal" below is phrased as a suggestion a human has to
// go act on elsewhere (there's no button here that changes anything).
export default async function QaRollupPage() {
  const logs = await prisma.learningLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500, // a rolling window, not the entire history forever
  });

  type Log = (typeof logs)[number];

  // Group by reasonCode — this is the raw material a human would
  // use to decide "should we change a rule or threshold because of
  // a pattern," never a decision made here.
  const byReason = new Map<string, number>();
  for (const l of logs) {
    const key = l.reasonCode ?? "unspecified";
    byReason.set(key, (byReason.get(key) ?? 0) + 1);
  }
  const reasonRows = Array.from(byReason.entries()).sort((a, b) => b[1] - a[1]);

  // Same correction repeated 3+ times is worth surfacing as a
  // pattern a human might want to turn into a standing rule.
  const byFromTo = new Map<string, { fromValue: string | null; toValue: string | null; count: number }>();
  for (const l of logs) {
    const key = `${l.fromValue ?? ""}→${l.toValue ?? ""}`;
    const existing = byFromTo.get(key) ?? { fromValue: l.fromValue, toValue: l.toValue, count: 0 };
    existing.count++;
    byFromTo.set(key, existing);
  }
  const repeatedPatterns = Array.from(byFromTo.values())
    .filter((p) => p.count >= 3)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Learning Review</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Patterns from correction history, for you to review — nothing here changes a rule
            or threshold automatically.
          </p>
        </div>

        <div className="px-8 py-5 max-w-3xl">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B675E] mb-2">
            Corrections by reason (last {logs.length} logged)
          </h2>
          {reasonRows.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-4 mb-6">No corrections logged yet.</div>
          ) : (
            <table className="w-full text-[13px] mb-6">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-wide text-[#6B675E] border-b border-line">
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Count</th>
                </tr>
              </thead>
              <tbody>
                {reasonRows.map(([reason, count]) => (
                  <tr key={reason} className="border-b border-line">
                    <td className="py-2 font-medium">{reason}</td>
                    <td className="py-2 font-mono">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[#6B675E] mb-2">
            Repeated correction patterns (3+ times) — worth a rule?
          </h2>
          {repeatedPatterns.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-4">
              No pattern has repeated 3 or more times yet.
            </div>
          ) : (
            repeatedPatterns.map((p, i) => (
              <div key={i} className="bg-brassSoft border-l-[3px] border-l-brass px-4 py-3 text-[12.5px] mb-2.5">
                Corrected <strong>{p.fromValue ?? "(unset)"}</strong> to{" "}
                <strong>{p.toValue ?? "(unset)"}</strong> {p.count} times. If this keeps
                happening, it may be worth a standing categorization rule — a human decision,
                not something this page can do.
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
