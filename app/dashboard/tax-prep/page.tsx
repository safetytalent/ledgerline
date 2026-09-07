import SideNav from "@/components/nav/SideNav";
import EntityTypeSelector from "@/components/tax/EntityTypeSelector";
import OwnersManager from "@/components/tax/OwnersManager";
import DocTagger from "@/components/tax/DocTagger";
import { prisma } from "@/lib/db";
import { getRequiredDocs, ISSUES_K1, type EntityType } from "@/lib/taxRequirements";

export const dynamic = "force-dynamic";

export default async function TaxPrepPage() {
  const clients = await prisma.client.findMany({
    include: { documents: true, owners: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Tax Prep Checklist</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Entity-aware document checklist — makes sure nothing is missing before a
            preparer starts the return. This tracks documents; it does not prepare or
            file anything.
          </p>
        </div>

        <div className="px-8 py-5">
          {clients.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-8 text-center">No clients yet.</div>
          ) : (
            clients.map((c: (typeof clients)[number]) => {
              const entityType = c.entityType as EntityType | null;
              const requiredDocs = entityType ? getRequiredDocs(entityType) : [];
              const taggedTypes = new Set(
                c.documents.map((d: (typeof c.documents)[number]) => d.docType).filter(Boolean)
              );
              const untagged = c.documents.filter(
                (d: (typeof c.documents)[number]) => !d.docType
              );

              return (
                <div key={c.id} className="mb-8 max-w-2xl border-b border-line pb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[16px] font-semibold">{c.name}</h2>
                    <EntityTypeSelector clientId={c.id} currentType={entityType} />
                  </div>

                  {!entityType ? (
                    <div className="text-[12.5px] text-[#6B675E] py-2">
                      Set an entity type above to see the required document checklist.
                    </div>
                  ) : (
                    <>
                      {ISSUES_K1[entityType] && (
                        <OwnersManager clientId={c.id} owners={c.owners} />
                      )}

                                <div className="mt-3">
                        <div className="text-[11px] uppercase tracking-wide text-[#6B675E] font-semibold mb-1.5">
                          Required documents
                        </div>
                        <div className="bg-white border border-line rounded-sm px-4">
                          {requiredDocs.map((doc) => {
                            const have = taggedTypes.has(doc);
                            return (
                              <div
                                key={doc}
                                className="flex items-center gap-2 py-1.5 text-[13px] border-b border-line last:border-none"
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    have ? "bg-teal" : "bg-rust"
                                  }`}
                                />
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
                      </div>

                      {untagged.length > 0 && (
                        <div className="mt-3">
                          <div className="text-[11px] uppercase tracking-wide text-[#6B675E] font-semibold mb-1.5">
                            Uploaded but not yet categorized
                          </div>
                          {untagged.map((d: (typeof untagged)[number]) => (
                            <DocTagger
                              key={d.id}
                              documentId={d.id}
                              fileName={d.fileName}
                              requiredDocs={requiredDocs}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
