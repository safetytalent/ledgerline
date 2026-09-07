const NAV_SECTIONS = [
  {
    label: "Work",
    items: [
      { name: "Review Queue", count: 18, active: true },
      { name: "Client Books", count: 42 },
      { name: "Close Checklist", count: 6 },
      { name: "Documents" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { name: "Agent Activity" },
      { name: "Anomalies", count: 2 },
      { name: "KPI Dashboards" },
    ],
  },
  {
    label: "Franchise",
    items: [{ name: "Network Scorecard" }, { name: "Royalty Reporting" }],
  },
];

export default function SideNav() {
  return (
    <div className="bg-ink text-[#DDE3F0] flex flex-col p-5 h-full">
      <div className="font-display text-xl font-semibold text-white mb-1">Ledgerline</div>
      <div className="text-[11px] text-[#8B97BE] mb-7">Sierra Bookkeeping — Houston TX</div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="text-[10.5px] uppercase tracking-wide text-[#5E6994] mt-5 mb-2 ml-2">
            {section.label}
          </div>
          {section.items.map((item) => (
            <div
              key={item.name}
              className={`px-2.5 py-2 rounded-sm text-[13.5px] mb-0.5 flex justify-between items-center cursor-pointer ${
                item.active
                  ? "bg-ink2 text-white border-l-2 border-brass pl-2"
                  : "text-[#B7C0DC]"
              }`}
            >
              {item.name}
              {item.count !== undefined && (
                <span className={`font-mono text-[11px] ${item.active ? "text-brass" : "text-[#7A85AC]"}`}>
                  {item.count}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className="mt-auto pt-4 border-t border-ink3 text-[12px] text-[#8B97BE]">
        <strong className="text-white block text-[13px] mb-0.5">Adrian Sierra</strong>
        Owner · TX3 Territory
      </div>
    </div>
  );
}
