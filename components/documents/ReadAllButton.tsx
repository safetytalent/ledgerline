"use client";

import { useState, useTransition } from "react";
import { retryAllExtractionsForClient } from "@/app/dashboard/documents/actions";

export default function ReadAllButton({ clientId, count }: { clientId: string; count: number }) {
  const [isPending, startTransition] = useTransition();
  const [started, setStarted] = useState(false);

  if (count === 0) return null;

  if (started) {
    return (
      <span className="text-[12px] text-teal ml-3">
        Reading started — refresh in a few seconds to see updates
      </span>
    );
  }

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await retryAllExtractionsForClient(clientId);
          setStarted(true);
        })
      }
      disabled={isPending}
      className="text-[12px] text-brass underline ml-3"
    >
      {isPending ? "Starting..." : `Read all ${count} unread now`}
    </button>
  );
}
