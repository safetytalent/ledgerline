import SideNav from "@/components/nav/SideNav";
import UploadForm from "@/components/documents/UploadForm";
import DocumentRow from "@/components/documents/DocumentRow";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const clients = await prisma.client.findMany({
    include: { documents: { orderBy: { uploadedAt: "desc" } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="grid grid-cols-[216px_1fr] h-screen">
      <SideNav />
      <div className="overflow-y-auto">
        <div className="px-8 py-6 border-b border-line">
          <h1 className="font-display text-[26px] font-medium mb-1">Documents</h1>
          <p className="text-[13px] text-[#6B675E] m-0">
            Real file storage per client — upload, download, delete
          </p>
        </div>
        <div className="px-8 py-5">
          {clients.length === 0 ? (
            <div className="text-[13px] text-[#6B675E] py-8 text-center">No clients yet.</div>
          ) : (
            clients.map((c: (typeof clients)[number]) => (
              <div key={c.id} className="mb-6 max-w-2xl">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-[15px] font-semibold">{c.name}</h2>
                  <UploadForm clientId={c.id} />
                </div>
                {c.documents.length === 0 ? (
                  <div className="text-[12.5px] text-[#6B675E] py-3">No documents uploaded yet.</div>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-[#6B675E] border-b border-line">
                        <th className="pb-1.5 font-medium">File</th>
                        <th className="pb-1.5 font-medium">Uploaded</th>
                        <th className="pb-1.5 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.documents.map((d: (typeof c.documents)[number]) => (
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
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
