import Link from "next/link";
import SideNav from "@/components/nav/SideNav";
import EntityTypeSelector from "@/components/tax/EntityTypeSelector";
import OwnersManager from "@/components/tax/OwnersManager";
import UploadForm from "@/components/documents/UploadForm";
import ReadAllButton from "@/components/documents/ReadAllButton";
import DocumentRow from "@/components/documents/DocumentRow";
import DocTagger from "@/components/tax/DocTagger";
import SyncNowButton from "@/components/clients/SyncNowButton";
import { prisma } from "@/lib/db";
import { getRequiredDocs, ISSUES_K1, type EntityType } from "@/lib/taxRequirements";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ClientDashboardPage({
  params,
}: {
  params: { clientId: string };
}) {
  const client = await prisma.client.findUnique({
    where: { id: params.clientId },
    include: {
      qboTokens: true,
      subscription: true,
      owners: true,
      documents: true,
      closeTasks: { where: { month: currentMonth() } },
      transactions: { select: { reviewStatus: true } },
    },
  });

  if (!client) notFound();

  const entityType = client.entityType as EntityType | null;
  const requiredDocs = entityType ? getRequiredDocs(entityType) : [];
  const taggedTypes = new Set(
    client.documents.map((d: (typeof client.documents)[number]) => d.docType).filter(Boolean)
  );
  const untaggedDocs = client.documents.filter(
    (d: (typeof client.documents)[number]) => !d.docType
  );
  const missingDocs = requiredDocs.filter((d) => !taggedTypes.has(d));

  const pendingTxns = client.transactions.filter(
    (t: (typeof client.transactions)[number]) => t.reviewStatus === "PENDING_REVIEW"
  ).length;
  const autoPostedTxns = client.transactions.filter(
    (t: (typeof client.transactions)[number]) => t.reviewStatus === "AUTO_POSTED"
  ).length;

  const CLOSE_TASK_COUNT = 8; // matches the fixed list on the Close Checklist page
  const closeDone = client.closeTasks.filter(
    (t: (typeof client.closeTasks)[number]) => t.done
  ).length;

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line flex items-center justify-between">
          <div>
            <Link href="/dashboard/clients" className="text-[12px] text-brass underline mb-1 inline-block">
              ← All clients
            </Link>
            <h1 className="font-display text-[26px] font-medium">{client.name}</h1>
          </div>
          <EntityTypeSelector clientId={client.id} currentType={entityType} />
        </div>

        <div className="px-8 py-5 max-w-3xl">
          {/* Overall progress snapshot */}
          <div className="grid grid-cols-4 border border-line rounded-sm mb-6">
            <div className="px-5 py-4 border-r border-line">
              <div className="font-mono text-[20px] font-medium">
                {requiredDocs.length > 0 ? `${requiredDocs.length - missingDocs.length}/${requiredDocs.length}` : "—"}
              </div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">tax docs ready</div>
            </div>
            <div className="px-5 py-4 border-r border-line">
              <div className="font-mono text-[20px] font-medium">{client.documents.length}</div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">files uploaded</div>
            </div>
            <div className="px-5 py-4 border-r border-line">
              <div className="font-mono text-[20px] font-medium">{closeDone}/{CLOSE_TASK_COUNT}</div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">close tasks done</div>
            </div>
            <div className="px-5 py-4">
              <div className="font-mono text-[20px] font-medium">{pendingTxns}</div>
              <div className="text-[11px] text-[#6B675E] mt-0.5">transactions need review</div>
            </div>
          </div>

          {/* Connection type — QuickBooks or document-only */}
          <div className="mb-6">
            <div className="text-[11px] uppercase tracking-wide text-[#6B675E] font-semibold mb-1.5">
              Bookkeeping data source
            </div>
            {client.qboTokens ? (
              <div className="bg-white border border-line rounded-sm p-3 flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-teal">
                    <span className="w-1.5 h-1.5 bg-teal rounded-full" />
                    Connected to QuickBooks
                  </span>
                  <div className="text-[12px] text-[#6B675E] mt-1">
                    {client.transactions.length} transactions on file · {autoPostedTxns} auto-posted · {pendingTxns} pending review
                  </div>
                </div>
                <SyncNowButton clientId={client.id} />
              </div>
            ) : (
              <div className="bg-white border border-line rounded-sm p-3 text-[13px] text-[#6B675E]">
                Not connected to QuickBooks — this client submits documents directly
                (bank statements, P&L, etc.) instead of a live accounting feed.
              </div>
            )}
          </div>

          {/* Entity-aware tax document checklist */}
          <div className="mb-6">
            {!entityType ? (
              <div className="text-[12.5px] text-[#6B675E]">
                Set an entity type above to see the required document checklist.
              </div>
            ) : (
              <>
                {ISSUES_K1[entityType] && (
                  <OwnersManager
                    clientId={client.id}
                    owners={client.owners.map((o: (typeof client.owners)[number]) => ({
                      id: o.id,
                      name: o.name,
                      ownershipPercent: Number(o.ownershipPercent),
                    }))}
                  />
                )}
                <div className="text-[11px] uppercase tracking-wide text-[#6B675E] font-semibold mb-1.5 mt-3">
                  Required tax documents
                </div>
                <div className="bg-white border border-line rounded-sm px-4">
                  {requiredDocs.map((doc) => {
                    const have = taggedTypes.has(doc);
                    return (
                      <div
                        key={doc}
                        className="flex items-center gap-2 py-1.5 text-[13px] border-b border-line last:border-none"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${have ? "bg-teal" : "bg-rust"}`} />
                        <span className={have ? "" : "text-[#6B675E]"}>{doc}</span>
                        {!have && (
                          <span className="font-mono text-[10px] uppercase text-rust bg-rustSoft px-1.5 py-0.5 rounded-sm">
                            missing
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Documents — upload and categorize */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] uppercase tracking-wide text-[#6B675E] font-semibold">
                Documents
              </div>
              <div className="flex items-center">
                <UploadForm clientId={client.id} />
                <ReadAllButton
                  clientId={client.id}
                  count={
                    client.documents.filter(
                      (d: (typeof client.documents)[number]) =>
                        d.extractionStatus === "NOT_EXTRACTED" || d.extractionStatus === "FAILED"
                    ).length
                  }
                />
              </div>
            </div>
            {client.documents.length === 0 ? (
              <div className="text-[12.5px] text-[#6B675E]">No documents uploaded yet.</div>
            ) : (
              <table className="w-full text-[13px] mb-2">
                <tbody>
                  {client.documents.map((d: (typeof client.documents)[number]) => (
                    <DocumentRow
                      key={d.id}
                      id={d.id}
                      fileName={d.fileName}
                      storagePath={d.storagePath}
                      uploadedAt={d.uploadedAt.toLocaleDateString()}
                      extractionStatus={d.extractionStatus}
                      extractedFields={d.extractedFields as { label: string; value: string }[] | null}
                      extractionError={d.extractionError}
                      noticeSummary={d.noticeSummary}
                      requiresLegalReview={d.requiresLegalReview}
                    />
                  ))}
                </tbody>
              </table>
            )}
            {untaggedDocs.length > 0 && entityType && (
              <div className="mt-2">
                <div className="text-[11px] text-[#6B675E] mb-1">Tag uploaded files against the checklist above:</div>
                {untaggedDocs.map((d: (typeof untaggedDocs)[number]) => (
                  <DocTagger key={d.id} documentId={d.id} fileName={d.fileName} requiredDocs={requiredDocs} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
