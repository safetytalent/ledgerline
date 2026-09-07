"use client";

import { useState, useTransition } from "react";

export default function SyncNowButton({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function sync() {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/qbo/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setResult(data.error ?? "Sync failed");
          return;
        }
        setResult(`Found ${data.found}, processed ${data.processed}`);
      } catch {
        setResult("Sync failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={sync} disabled={isPending} className="text-[12px] text-brass underline">
        {isPending ? "Syncing..." : "Sync now"}
      </button>
      {result && <span className="text-[11px] text-[#6B675E]">{result}</span>}
    </div>
  );
}
