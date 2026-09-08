"use client";

import { useTransition } from "react";
import { retryAllExtractionsForClient } from "@/app/dashboard/documents/actions";

export default function ReadAllButton({ clientId, count }: { clientId: string; count: number }) {
  const [isPending, startTransition] = useTransition();

  if (count === 0) return null;

  return (
    <button
      onClick={() => startTransition(() => retryAllExtractionsForClient(clientId))}
      disabled={isPending}
      className="text-[12px] text-brass underline ml-3"
    >
      {isPending ? `Reading ${count} document${count === 1 ? "" : "s"}...` : `Read all ${count} unread now`}
    </button>
  );
}
