"use client";

import { useRef, useTransition } from "react";
import { uploadDocument } from "@/app/dashboard/documents/actions";

export default function UploadForm({ clientId }: { clientId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      await uploadDocument(clientId, formData);
      if (fileInput.current) fileInput.current.value = "";
    });
  }

  return (
    <label className="text-[12px] text-brass underline cursor-pointer">
      {isPending ? "Uploading..." : "+ Upload document"}
      <input ref={fileInput} type="file" onChange={handleChange} className="hidden" />
    </label>
  );
}
