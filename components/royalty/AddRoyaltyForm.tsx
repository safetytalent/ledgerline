"use client";

import { useState, useTransition } from "react";
import { addRoyaltyReport } from "@/app/dashboard/royalty-reporting/actions";

export default function AddRoyaltyForm({ locationId }: { locationId: string }) {
  const [open, setOpen] = useState(false);
  const [periodEnd, setPeriodEnd] = useState("");
  const [revenue, setRevenue] = useState("");
  const [rate, setRate] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    const rev = parseFloat(revenue);
    const rt = parseFloat(rate);
    if (!periodEnd || isNaN(rev) || isNaN(rt)) return;
    startTransition(async () => {
      await addRoyaltyReport(locationId, periodEnd, rev, rt);
      setPeriodEnd("");
      setRevenue("");
      setRate("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[12px] text-brass underline">
        + Log royalty period
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 bg-white border border-line rounded-sm p-3 mb-3">
      <div>
        <label className="block text-[11px] text-[#6B675E] mb-1">Period end</label>
        <input
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          className="border border-line rounded-sm px-2 py-1.5 text-[13px]"
        />
      </div>
      <div>
        <label className="block text-[11px] text-[#6B675E] mb-1">Revenue ($)</label>
        <input
          type="number"
          value={revenue}
          onChange={(e) => setRevenue(e.target.value)}
          className="border border-line rounded-sm px-2 py-1.5 text-[13px] w-28"
        />
      </div>
      <div>
        <label className="block text-[11px] text-[#6B675E] mb-1">Royalty rate (%)</label>
        <input
          type="number"
          step="0.1"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="border border-line rounded-sm px-2 py-1.5 text-[13px] w-24"
        />
      </div>
      <button
        onClick={submit}
        disabled={isPending}
        className="bg-ink text-white text-[13px] font-medium px-4 py-2 rounded-sm"
      >
        {isPending ? "Saving..." : "Save"}
      </button>
      <button onClick={() => setOpen(false)} className="text-[#6B675E] text-[13px] px-2 py-2">
        Cancel
      </button>
    </div>
  );
}
