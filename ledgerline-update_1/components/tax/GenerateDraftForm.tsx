"use client";

import { useState, useTransition } from "react";
import { generateReturnDraft, generatePersonalReturnDraft } from "@/app/dashboard/tax-returns/actions";

export default function GenerateDraftForm({ clients }: { clients: { id: string; name: string }[] }) {
  const [clientId, setClientId] = useState("");
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()));
  const [kind, setKind] = useState<"business" | "personal">("business");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!clientId || !taxYear.trim()) return;
    startTransition(() =>
      kind === "business"
        ? generateReturnDraft(clientId, taxYear.trim())
        : generatePersonalReturnDraft(clientId, taxYear.trim())
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as "business" | "personal")}
        className="border border-line rounded-sm px-2 py-1.5 text-[13px]"
      >
        <option value="business">Business return</option>
        <option value="personal">Personal return</option>
      </select>
      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="border border-line rounded-sm px-2 py-1.5 text-[13px]"
      >
        <option value="" disabled>
          Select client...
        </option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={taxYear}
        onChange={(e) => setTaxYear(e.target.value)}
        placeholder="Tax year"
        className="border border-line rounded-sm px-2 py-1.5 text-[13px] w-24"
      />
      <button
        onClick={submit}
        disabled={isPending || !clientId}
        className="bg-ink text-white text-[12.5px] font-medium px-3 py-1.5 rounded-sm disabled:opacity-40"
      >
        Generate draft
      </button>
    </div>
  );
}
