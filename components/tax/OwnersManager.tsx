"use client";

import { useState, useTransition } from "react";
import { addOwner, removeOwner } from "@/app/dashboard/tax-prep/actions";

type Owner = { id: string; name: string; ownershipPercent: number };

export default function OwnersManager({
  clientId,
  owners,
}: {
  clientId: string;
  owners: Owner[];
}) {
  const [name, setName] = useState("");
  const [pct, setPct] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = owners.reduce((sum, o) => sum + Number(o.ownershipPercent), 0);

  function submit() {
    const p = parseFloat(pct);
    if (!name.trim() || isNaN(p)) return;
    startTransition(async () => {
      await addOwner(clientId, name, p);
      setName("");
      setPct("");
    });
  }

  return (
    <div className="mt-2">
      <div className="text-[11px] uppercase tracking-wide text-[#6B675E] font-semibold mb-1.5">
        Owners / Shareholders (for K-1 allocation)
      </div>
      {owners.length === 0 ? (
        <div className="text-[12.5px] text-[#6B675E] mb-2">No owners added yet.</div>
      ) : (
        <table className="text-[13px] mb-2">
          <tbody>
            {owners.map((o) => (
              <tr key={o.id}>
                <td className="pr-4 py-1">{o.name}</td>
                <td className="pr-4 py-1 font-mono">{Number(o.ownershipPercent)}%</td>
                <td className="py-1">
                  <button
                    onClick={() => startTransition(() => removeOwner(o.id))}
                    className="text-rust underline text-[12px]"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td className="pr-4 pt-1 font-semibold">Total</td>
              <td className={`pr-4 pt-1 font-mono font-semibold ${total !== 100 ? "text-rust" : "text-teal"}`}>
                {total}%
              </td>
              <td className="pt-1">
                {total !== 100 && (
                  <span className="text-[11px] text-rust">Should total 100%</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Owner name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-line rounded-sm px-2 py-1.5 text-[13px] w-40"
        />
        <input
          type="number"
          placeholder="% owned"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
          className="border border-line rounded-sm px-2 py-1.5 text-[13px] w-24"
        />
        <button
          onClick={submit}
          disabled={isPending}
          className="bg-ink text-white text-[12.5px] font-medium px-3 py-1.5 rounded-sm"
        >
          Add
        </button>
      </div>
    </div>
  );
}
