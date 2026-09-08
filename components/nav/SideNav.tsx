"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    label: "Clients",
    items: [
      { name: "Client Books", href: "/dashboard/clients" },
      { name: "Work Queue", href: "/dashboard/review-queue" },
      { name: "Close Checklist", href: "/dashboard/close-checklist" },
      { name: "Tax Prep Checklist", href: "/dashboard/tax-prep" },
      { name: "Documents", href: "/dashboard/documents" },
    ],
  },
  {
    label: "Firm oversight",
    items: [
      { name: "Operations Overview", href: "/dashboard/operations" },
      { name: "Financial Reports", href: "/dashboard/reports" },
      { name: "Agent Activity", href: "/dashboard/agent-activity" },
      { name: "Anomalies", href: "/dashboard/anomalies" },
      { name: "KPI Dashboards", href: "/dashboard/kpi" },
    ],
  },
  {
    label: "Franchise",
    items: [
      { name: "Network Scorecard", href: "/dashboard/network-scorecard" },
      { name: "Royalty Reporting", href: "/dashboard/royalty-reporting" },
    ],
  },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <div className="bg-ink text-[#DDE3F0] flex flex-col p-5 h-full">
      <Link href="/dashboard/clients" className="font-display text-xl font-semibold text-white mb-1">
        Ledgerline
      </Link>
      <div className="text-[11px] text-[#8B97BE] mb-7">Sierra Bookkeeping — Houston TX</div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="text-[10.5px] uppercase tracking-wide text-[#5E6994] mt-5 mb-2 ml-2">
            {section.label}
          </div>
          {section.items.map((item) => {
            const isActive = item.href && pathname === item.href;

            if (!item.href) {
              // Not built yet — shown for context, but explicitly
              // non-interactive rather than pretending it works.
              return (
                <div
                  key={item.name}
                  className="px-2.5 py-2 rounded-sm text-[13.5px] mb-0.5 flex justify-between items-center text-[#5E6994] cursor-default"
                >
                  {item.name}
                  <span className="font-mono text-[9.5px] uppercase tracking-wide">Soon</span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`px-2.5 py-2 rounded-sm text-[13.5px] mb-0.5 flex justify-between items-center cursor-pointer ${
                  isActive
                    ? "bg-ink2 text-white border-l-2 border-brass pl-2"
                    : "text-[#B7C0DC] hover:bg-ink2/50"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto pt-4 border-t border-ink3 text-[12px] text-[#8B97BE]">
        <strong className="text-white block text-[13px] mb-0.5">Adrian Sierra</strong>
        Owner · TX3 Territory
      </div>
    </div>
  );
}
