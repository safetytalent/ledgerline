"use client";

import { useState, useTransition } from "react";
import { SERVICE_CATEGORIES, AUTOMATED_SERVICES } from "@/lib/services";
import { updateClientServices } from "@/app/dashboard/clients/actions";

export default function ServiceEditor({
  clientId,
  initialServices,
}: {
  clientId: string;
  initialServices: string[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(initialServices));
  const [isPending, startTransition] = useTransition();

  function toggle(service: string) {
    const next = new Set(selected);
    next.has(service) ? next.delete(service) : next.add(service);
    setSelected(next);
  }

  function save() {
    startTransition(async () => {
      await updateClientServices(clientId, Array.from(selected));
      setOpen(false);
    });
  }

  return (
    <div>
      {initialServices.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5 max-w-[220px]">
          {initialServices.map((s) => (
            <span
              key={s}
              className="text-[10.5px] bg-paper2 border border-line px-1.5 py-0.5 rounded-sm"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(true)} className="text-[12px] text-brass underline">
        {initialServices.length > 0 ? "Edit services" : "Add services"}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="font-display text-[18px] font-medium mb-1">Client services</h3>
            <p className="text-[12.5px] text-[#6B675E] mb-4">
              Check every service this client is signed up for. Items marked{" "}
              <span className="font-mono text-teal">automated</span> have a real working
              feature behind them today — everything else is tracked here for staff
              visibility until its own workflow is built.
            </p>

            {SERVICE_CATEGORIES.map((cat) => (
              <div key={cat.category} className="mb-4">
                <div className="text-[11px] uppercase tracking-wide text-[#6B675E] font-semibold mb-1.5">
                  {cat.category}
                </div>
                {cat.services.map((service) => (
                  <label
                    key={service}
                    className="flex items-center gap-2 py-1 text-[13px] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(service)}
                      onChange={() => toggle(service)}
                    />
                    <span>{service}</span>
                    {AUTOMATED_SERVICES.has(service) && (
                      <span className="font-mono text-[10px] uppercase text-teal bg-tealSoft px-1.5 py-0.5 rounded-sm">
                        automated
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ))}

            <div className="flex gap-2 mt-4">
              <button
                onClick={save}
                disabled={isPending}
                className="bg-ink text-white text-[13px] font-medium px-4 py-2 rounded-sm"
              >
                {isPending ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-[#6B675E] text-[13px] px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
