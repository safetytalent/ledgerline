"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/app/dashboard/clients/actions";

export default function AddClientButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createClient(name);
      setName("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-ink text-white text-[13px] font-medium px-4 py-2 rounded-sm"
      >
        + Add client
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        placeholder="Client name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="border border-line rounded-sm px-3 py-2 text-[13px]"
      />
      <button
        onClick={submit}
        disabled={isPending}
        className="bg-ink text-white text-[13px] font-medium px-4 py-2 rounded-sm"
      >
        {isPending ? "Adding..." : "Add"}
      </button>
      <button onClick={() => setOpen(false)} className="text-[#6B675E] text-[13px] px-2">
        Cancel
      </button>
    </div>
  );
}
