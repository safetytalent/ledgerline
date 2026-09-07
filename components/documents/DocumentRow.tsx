"use client";

import { useTransition } from "react";
import { getDocumentUrl, deleteDocument } from "@/app/dashboard/documents/actions";

export default function DocumentRow({
  id,
  fileName,
  storagePath,
  uploadedAt,
}: {
  id: string;
  fileName: string;
  storagePath: string;
  uploadedAt: string;
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
    <tr className="border-b border-line">
      <td className="py-2.5 font-medium">{fileName}</td>
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
