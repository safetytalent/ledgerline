"use client";

import { useTransition } from "react";
import { toggleCloseTask } from "@/app/dashboard/close-checklist/actions";

export default function CloseChecklistRow({
  clientId,
  month,
  taskLabel,
  done,
}: {
  clientId: string;
  month: string;
  taskLabel: string;
  done: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(() => toggleCloseTask(clientId, month, taskLabel, !done));
  }

  return (
    <label className="flex items-center gap-2 py-1.5 text-[13px] cursor-pointer border-b border-line last:border-none">
      <input type="checkbox" checked={done} disabled={isPending} onChange={toggle} />
      <span className={done ? "line-through text-[#6B675E]" : ""}>{taskLabel}</span>
    </label>
  );
}
