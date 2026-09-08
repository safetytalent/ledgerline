"use client";

import { useState, useTransition } from "react";
import { deleteClient } from "@/app/dashboard/clients/actions";

export default function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-[11.5px] text-rust underline"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={`Type "${clientName}" to confirm`}
        className="text-[11.5px] border border-rust px-1.5 py-1 w-40"
      />
      <button
        onClick={() => startTransition(() => deleteClient(clientId))}
        disabled={typed !== clientName || isPending}
        className="text-[11.5px] font-semibold bg-rust text-white px-2 py-1 disabled:opacity-40"
      >
        {isPending ? "Deleting..." : "Confirm delete"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-[11.5px] text-inkFaint underline">
        Cancel
      </button>
    </div>
  );
}
