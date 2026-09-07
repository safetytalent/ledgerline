"use client";

import { useTransition } from "react";
import { setEntityType } from "@/app/dashboard/tax-prep/actions";
import { ENTITY_TYPE_LABELS, type EntityType } from "@/lib/taxRequirements";

export default function EntityTypeSelector({
  clientId,
  currentType,
}: {
  clientId: string;
  currentType: EntityType | null;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    if (!value) return;
    startTransition(() => setEntityType(clientId, value as EntityType));
  }

  return (
    <select
      value={currentType ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isPending}
      className="border border-line rounded-sm px-2 py-1.5 text-[13px]"
    >
      <option value="" disabled>
        Set entity type...
      </option>
      {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map((t) => (
        <option key={t} value={t}>
          {ENTITY_TYPE_LABELS[t]}
        </option>
      ))}
    </select>
  );
}
