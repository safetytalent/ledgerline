import SideNav from "@/components/nav/SideNav";
import { prisma } from "@/lib/db";
import { agingBucket } from "@/lib/agents/ar-nudge-agent";
import MarkSentButton from "@/components/ar/MarkSentButton";

export const dynamic = "force-dynamic";

const BUCKET_ORDER = ["90+ days", "61-90 days", "31-60 days", "1-30 days", "Current"];
const BUCKET_STYLE: Record<string, string> = {
  "90+ days": "bg-rustSoft text-rust",
  "61-90 days": "bg-rustSoft text-rust",
  "31-60 days": "bg-brassSoft text-brassDeep",
  "1-30 days": "bg-brassSoft text-brassDeep",
  Current: "bg-tealSoft text-teal",
};

export default async function ArRemindersPage() {
  const invoices = await prisma.invoice.findMany({
    where: { balance: { gt: 0 } },
    include: { client: true, reminders: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { dueDate: "asc" },
  });

  const grouped = new Map<string, typeof invoices>();
  for (const inv of invoices) {
    const bucket = agingBucket(inv.dueDate);
    grouped.set(bucket, [...(grouped.get(bucket) ?? []), inv]);
  }
  type InvoiceWithClient = (typeof invoices)[number];

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium">AR Reminders</h1>
          <p className="text-[12.5px] text-inkFaint mt-1">
            The AR Nudge Agent drafts reminders for overdue invoices — it never sends anything.
            Every send is a human action.
          </p>
        </div>

        <div className="px-8 py-5 max-w-4xl">
          {invoices.length === 0 ? (
            <p className="text-[13px] text-inkFaint">No open invoices right now.</p>
          ) : (
            BUCKET_ORDER.filter((b) => grouped.has(b)).map((bucket) => (
              <div key={bucket} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`font-mono text-[10px] uppercase px-1.5 py-0.5 ${BUCKET_STYLE[bucket]}`}
                  >
                    {bucket}
                  </span>
                  <span className="text-[12px] text-inkFaint">
                    {grouped.get(bucket)!.length} invoice{grouped.get(bucket)!.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="border border-line bg-white">
                  {grouped.get(bucket)!.map((inv: InvoiceWithClient) => {
                    const draft = inv.reminders[0];
                    return (
                      <div key={inv.id} className="border-b border-line last:border-none p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-[13.5px]">{inv.customerName}</div>
                            <div className="text-[11.5px] text-inkFaint">
                              {inv.client.name} · Due {inv.dueDate.toLocaleDateString()}
                            </div>
                          </div>
                          <div className="font-mono text-[15px] font-medium">
                            ${Number(inv.balance).toLocaleString()}
                          </div>
                        </div>
                        {draft && draft.status === "DRAFT" && (
                          <div className="bg-paper2 border border-line p-3 mt-2">
                            <div className="text-[11.5px] font-semibold mb-1">{draft.subject}</div>
                            <div className="text-[12px] text-inkSoft whitespace-pre-wrap mb-2">
                              {draft.body}
                            </div>
                            <MarkSentButton reminderId={draft.id} />
                          </div>
                        )}
                        {draft && draft.status === "SENT" && (
                          <div className="text-[11.5px] text-teal mt-1">
                            Sent {draft.sentAt?.toLocaleDateString()}
                          </div>
                        )}
                        {!draft && (
                          <div className="text-[11.5px] text-inkFaint mt-1">
                            No draft yet — runs automatically on the next QuickBooks sync.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
