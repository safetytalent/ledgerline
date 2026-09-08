"use client";

import { useTransition } from "react";
import { markReminderSent } from "@/app/dashboard/ar-reminders/actions";

export default function MarkSentButton({ reminderId }: { reminderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => markReminderSent(reminderId))}
      disabled={isPending}
      className="text-[11.5px] font-semibold bg-ink text-paper px-2.5 py-1"
    >
      I sent this — mark sent
    </button>
  );
}
