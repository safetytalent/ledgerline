const KPIS = [
  { num: "94.2%", label: "auto-categorized this week" },
  { num: "18", label: "awaiting your review" },
  { num: "2.1 min", label: "avg. time to clear a queue item" },
  { num: "$0", label: "miscoded $ found this month" },
];

export default function KpiStrip() {
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
