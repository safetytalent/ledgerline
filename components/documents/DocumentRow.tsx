"use client";

import { useTransition } from "react";
import { getDocumentUrl, deleteDocument } from "@/app/dashboard/documents/actions";
import ExtractionPanel from "@/components/documents/ExtractionPanel";
import type { ExtractedField } from "@/lib/agents/intake-agent";

export default function DocumentRow({
  id,
  fileName,
  storagePath,
  uploadedAt,
  extractionStatus,
  extractedFields,
  extractionError,
  noticeSummary,
  requiresLegalReview,
}: {
  id: string;
  fileName: string;
  storagePath: string;
  uploadedAt: string;
  extractionStatus: string;
  extractedFields: ExtractedField[] | null;
  extractionError: string | null;
  noticeSummary: string | null;
  requiresLegalReview: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function download() {
    startTransition(async () => {
      const url = await getDocumentUrl(storagePath);
      window.open(url, "_blank");
    });
  }

  function remove() {
    startTransition(() => deleteDocument(id, storagePath));
  }

  return (
    <tr className="border-b border-line align-top">
      <td className="py-2.5 font-medium">
        {fileName}
        <ExtractionPanel
          documentId={id}
          status={extractionStatus}
          fields={extractedFields}
          error={extractionError}
          noticeSummary={noticeSummary}
          requiresLegalReview={requiresLegalReview}
        />
      </td>
      <td className="py-2.5 font-mono text-[12px] text-[#6B675E]">{uploadedAt}</td>
      <td className="py-2.5">
        <button
          onClick={download}
          disabled={isPending}
          className="text-brass underline text-[12.5px] mr-3"
        >
          Download
        </button>
        <button onClick={remove} disabled={isPending} className="text-rust underline text-[12.5px]">
          Delete
        </button>
      </td>
    </tr>
  );
}
