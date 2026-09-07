import SideNav from "@/components/nav/SideNav";
import AddRoyaltyForm from "@/components/royalty/AddRoyaltyForm";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RoyaltyReportingPage() {
  const locations = await prisma.location.findMany({ orderBy: { createdAt: "asc" } });
  const reports = await prisma.royaltyReport.findMany({
    where: { locationId: { in: locations.map((l: (typeof locations)[number]) => l.id) } },
    orderBy: { periodEnd: "desc" },
  });

  const locationName = (id: string) =>
    locations.find((l: (typeof locations)[number]) => l.id === id)?.name ?? id;

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Royalty Reporting</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Log revenue per location and calculate royalty due — real numbers, saved for real
          </p>
        </div>
        <div className="px-8 py-5 max-w-2xl">
          {locations.map((loc: (typeof locations)[number]) => (
            <div key={loc.id} className="mb-3">
              <AddRoyaltyForm locationId={loc.id} />
            </div>
          ))}

          <h2 className="text-[15px] font-semibold mb-3 mt-2">History</h2>
          {reports.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-8 text-center">
              No royalty periods logged yet.
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-wide text-[#6B675E] border-b border-line">
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Period end</th>
                  <th className="pb-2 font-medium">Revenue</th>
                  <th className="pb-2 font-medium">Royalty due</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r: (typeof reports)[number]) => (
                  <tr key={r.id} className="border-b border-line">
                    <td className="py-2.5 font-medium">{locationName(r.locationId)}</td>
                    <td className="py-2.5 font-mono">{r.periodEnd.toLocaleDateString()}</td>
                    <td className="py-2.5 font-mono">$${Number(r.revenue).toLocaleString()}</td>
                    <td className="py-2.5 font-mono">${Number(r.royaltyDue).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
