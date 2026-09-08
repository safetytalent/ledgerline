"use client";

import { useRef, useState, useTransition } from "react";
import { uploadDocument } from "@/app/dashboard/documents/actions";

export default function UploadForm({ clientId }: { clientId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);

  function handleChange() {
    const files = fileInput.current?.files;
    if (!files || files.length === 0) return;

    startTransition(async () => {
      const total = files.length;
      for (let i = 0; i < total; i++) {
        setProgress(total > 1 ? `Uploading ${i + 1} of ${total}...` : "Uploading...");
        const formData = new FormData();
        formData.set("file", files[i]);
        await uploadDocument(clientId, formData);
      }
      setProgress(null);
      if (fileInput.current) fileInput.current.value = "";
    });
  }

  return (
    <label className="text-[12px] text-brass underline cursor-pointer">
      {isPending ? progress ?? "Uploading..." : "+ Upload documents"}
      <input ref={fileInput} type="file" multiple onChange={handleChange} className="hidden" />
    </label>
  );
}
