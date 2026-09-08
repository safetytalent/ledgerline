"use client";

import { useState, useTransition } from "react";
import { recordPreparerSignoff } from "@/app/dashboard/tax-returns/actions";

// Rule 1 gate, client side: this is the only UI path to preparer
// approval, and it requires the preparer to actually type their
// initials to confirm — not a stray click on a checkbox. The real
// enforcement lives in the server action itself, not here; this is
// just making the deliberate-confirmation intent visible.
export default function SignoffButton({ draftId }: { draftId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [initials, setInitials] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="bg-ink text-white text-[12.5px] font-medium px-3 py-1.5 rounded-sm"
      >
        Record preparer sign-off
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Type initials to confirm"
        value={initials}
        onChange={(e) => setInitials(e.target.value)}
        className="border border-line rounded-sm px-2 py-1.5 text-[13px] w-40"
      />
      <button
        onClick={() => startTransition(() => recordPreparerSignoff(draftId))}
        disabled={isPending || initials.trim().length < 2}
        className="bg-teal text-white text-[12.5px] font-medium px-3 py-1.5 rounded-sm disabled:opacity-40"
      >
        Confirm sign-off
      </button>
      <button onClick={() => setConfirming(false)} className="text-[12px] text-[#6B675E] underline">
        Cancel
      </button>
    </div>
  );
}
