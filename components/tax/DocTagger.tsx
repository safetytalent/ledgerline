"use client";

import { useTransition } from "react";
import { tagDocumentType } from "@/app/dashboard/tax-prep/actions";

export default function DocTagger({
  documentId,
  fileName,
  requiredDocs,
}: {
  documentId: string;
  fileName: string;
  requiredDocs: string[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    if (!value) return;
    startTransition(() => tagDocumentType(documentId, value));
  }

  return (
    <div className="flex items-center gap-2 py-1 text-[13px]">
      <span className="text-[#6B675E]">{fileName}</span>
      <span className="text-[11px] text-[#6B675E]">→</span>
      <select
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        defaultValue=""
        className="border border-line rounded-sm px-2 py-1 text-[12px]"
      >
        <option value="" disabled>
          Tag as...
        </option>
        {requiredDocs.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </div>
  );
}
