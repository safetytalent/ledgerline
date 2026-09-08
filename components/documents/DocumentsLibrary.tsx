// components/documents/DocumentsLibrary.tsx
//
// Ledgerline — Documents & Forms Library screen. Structural and visual
// baseline from the Phase 2 handover's Appendix C, preserved exactly
// (register list, field-provenance tags, status trail) — wired here to
// real template/client/QBO data from Phase H instead of the original
// file's sample arrays. Hex values promoted into the shared Tailwind
// palette per the original file's own bottom-of-file suggestion,
// reusing the app's existing ink/paper/brass/teal/rust tokens instead
// of a second competing palette.

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { sendForPreparerReview, sendForESignature, markAsFiled } from "@/app/dashboard/document-library/actions";

export type Provenance = "qbo" | "record" | "manual";

export interface FieldRow {
  label: string;
  value: string;
  provenance: Provenance;
  empty?: boolean;
}

export interface RegisterItem {
  id: string; // FormInstance id
  name: string;
  meta: string;
  status: "ready" | "signature" | "waiting";
}

export interface CategoryInfo {
  key: string;
  label: string;
  count: number;
}

export interface TrailStep {
  label: string;
  note: string;
  stage: "done" | "current" | "upcoming";
}

const STATUS_STYLE: Record<RegisterItem["status"], string> = {
  ready: "bg-tealSoft text-teal",
  signature: "bg-rustSoft text-rust",
  waiting: "bg-brassSoft text-brassDeep",
};

const STATUS_LABEL: Record<RegisterItem["status"], string> = {
  ready: "AUTO-FILL READY",
  signature: "CLIENT SIGNATURE REQUIRED",
  waiting: "SEND TO CONTRACTOR",
};

const PROVENANCE_STYLE: Record<Provenance, string> = {
  qbo: "bg-[#e4ecf5] text-[#2b4f7c]",
  record: "bg-tealSoft text-teal",
  manual: "bg-brassSoft text-brassDeep",
};

const PROVENANCE_LABEL: Record<Provenance, string> = {
  qbo: "QUICKBOOKS",
  record: "CLIENT RECORD",
  manual: "NEEDS INPUT",
};

interface Props {
  clients: { id: string; name: string }[];
  selectedClientId: string;
  selectedClientName: string;
  categories: CategoryInfo[];
  selectedCategoryKey: string;
  selectedCategoryLabel: string;
  register: RegisterItem[];
  selectedRegisterId: string;
  selectedName: string;
  fields: FieldRow[];
  trail: TrailStep[];
  canRequestSignature: boolean;
  canFile: boolean;
  formInstanceId: string | null;
}

export default function DocumentsLibrary({
  clients,
  selectedClientId,
  selectedClientName,
  categories,
  selectedCategoryKey,
  selectedCategoryLabel,
  register,
  selectedRegisterId,
  selectedName,
  fields,
  trail,
  canRequestSignature,
  canFile,
  formInstanceId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(next: { client?: string; category?: string; item?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.client) params.set("client", next.client);
    if (next.category) {
      params.set("category", next.category);
      params.delete("item"); // switching category drops the old selection
    }
    if (next.item) params.set("item", next.item);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex h-screen min-h-[720px] bg-paper text-ink text-sm font-sans">
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <div className="h-[60px] flex items-center gap-6 px-6 bg-ink text-paper border-b-[3px] border-brass shrink-0">
          <div className="font-display font-semibold text-lg tracking-tight">
            LEDGER<span className="text-brassSoft">LINE</span>
          </div>
          <div className="text-[13px] text-[#aab3c4]">
            Documents &amp; Forms / <span className="font-semibold text-paper">{selectedCategoryLabel}</span>
          </div>
          <select
            value={selectedClientId}
            onChange={(e) => navigate({ client: e.target.value })}
            className="ml-auto bg-ink2 border border-[#3a4d6e] px-3.5 py-1.5 text-[12.5px] text-[#e4dfcf]"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left index */}
          <div className="w-[250px] bg-white border-r border-line py-5 shrink-0 overflow-y-auto">
            <IndexHeading>Document Library</IndexHeading>
            {categories.map((c) => (
              <button key={c.key} onClick={() => navigate({ category: c.key })} className="w-full text-left">
                <IndexItem label={c.label} count={c.count} active={c.key === selectedCategoryKey} />
              </button>
            ))}
          </div>

          {/* Register */}
          <div className="w-[380px] bg-paper border-r border-line overflow-y-auto shrink-0">
            <div className="px-5 pt-[18px] pb-3 border-b border-line">
              <h1 className="font-display text-[19px] mb-1">{selectedCategoryLabel}</h1>
              <p className="text-[12.5px] text-inkFaint m-0">
                Auto-filled from the client record and connected QuickBooks data where possible.
              </p>
            </div>

            {register.length === 0 ? (
              <div className="px-5 py-4 text-[13px] text-inkFaint">No templates in this category yet.</div>
            ) : (
              register.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate({ item: item.id })}
                  className={`w-full text-left px-5 py-3.5 border-b border-line flex flex-col gap-1.5 ${
                    item.id === selectedRegisterId ? "bg-tealSoft border-l-[3px] border-l-teal" : "hover:bg-paper2"
                  }`}
                >
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-semibold text-sm">{item.name}</span>
                    <span className={`font-mono text-[10.5px] px-1.5 py-0.5 whitespace-nowrap ${STATUS_STYLE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <div className="font-mono text-[11.5px] text-inkFaint">{item.meta}</div>
                </button>
              ))
            )}
          </div>

          {/* Detail panel */}
          <div className="flex-1 overflow-y-auto bg-white min-w-0">
            <div className="max-w-[640px] mx-auto px-9 pt-8 pb-[60px]">
              {!formInstanceId ? (
                <div className="text-[13px] text-inkFaint py-10 text-center">
                  Select a document from the list to view its auto-filled fields.
                </div>
              ) : (
                <>
                  <h1 className="font-display text-2xl mb-1.5">{selectedName}</h1>
                  <div className="text-[13px] text-inkFaint mb-6">{selectedClientName}</div>

                  {/* Status trail */}
                  <div className="relative flex items-center my-6 mb-9">
                    <div className="absolute left-[9px] right-[9px] top-[9px] h-px bg-line z-0" />
                    {trail.map((step, i) => (
                      <div key={i} className="flex-1 flex flex-col items-start relative z-10">
                        <div
                          className={`w-[19px] h-[19px] mb-2 flex items-center justify-center text-[11px] border-2 ${
                            step.stage === "done"
                              ? "bg-teal border-teal text-white"
                              : step.stage === "current"
                              ? "bg-brass border-brass text-white"
                              : "bg-white border-line text-transparent"
                          }`}
                        >
                          {step.stage === "done" ? "✓" : step.stage === "current" ? i + 1 : ""}
                        </div>
                        <div className={`text-xs font-semibold ${step.stage === "current" ? "text-brassDeep" : "text-inkSoft"}`}>
                          {step.label}
                        </div>
                        <div className="text-[11px] text-inkFaint mt-0.5 max-w-[120px]">{step.note}</div>
                      </div>
                    ))}
                  </div>

                  <div className="border border-line bg-paper mb-5">
                    <div className="px-4 py-2.5 border-b border-line font-mono text-[11px] tracking-wide uppercase text-inkFaint">
                      Auto-filled fields
                    </div>
                    {fields.map((f) => (
                      <div
                        key={f.label}
                        className="grid grid-cols-[150px_1fr_auto] items-center gap-3.5 px-4 py-3 border-b border-line last:border-b-0"
                      >
                        <div className="text-[13px] text-inkSoft font-medium">{f.label}</div>
                        <div
                          className={`text-[13.5px] bg-white border px-2.5 py-1.5 ${
                            f.empty ? "text-inkFaint italic border-dashed border-line" : "border-line"
                          }`}
                        >
                          {f.value || "—"}
                        </div>
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 whitespace-nowrap ${PROVENANCE_STYLE[f.provenance]}`}>
                          {PROVENANCE_LABEL[f.provenance]}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2.5 mt-7 pt-5 border-t border-line">
                    <button className="px-5 py-2.5 text-[13.5px] font-semibold border border-line text-inkSoft">
                      Save draft
                    </button>
                    <button
                      onClick={() => formInstanceId && sendForPreparerReview(formInstanceId)}
                      className="px-5 py-2.5 text-[13.5px] font-semibold bg-ink text-paper"
                    >
                      Send for preparer review
                    </button>
                    <button
                      onClick={() => canRequestSignature && formInstanceId && sendForESignature(formInstanceId)}
                      disabled={!canRequestSignature}
                      className="px-5 py-2.5 text-[13.5px] font-semibold bg-paper2 text-inkFaint border border-line disabled:cursor-not-allowed"
                    >
                      Send for e-signature
                    </button>
                    <button
                      onClick={() => canFile && formInstanceId && markAsFiled(formInstanceId)}
                      disabled={!canFile}
                      className="px-5 py-2.5 text-[13.5px] font-semibold bg-paper2 text-inkFaint border border-line disabled:cursor-not-allowed"
                    >
                      File with IRS
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-inkFaint border-l-2 border-brass pl-2.5">
                    E-signature unlocks once a preparer approves this draft. Filing unlocks only after the
                    client signs — no exceptions, even for auto-filled data.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndexHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] uppercase tracking-wider text-inkFaint px-5 pb-3 m-0 font-mono font-semibold">
      {children}
    </h2>
  );
}

function IndexItem({ label, count, active }: { label: string; count?: number; active?: boolean }) {
  return (
    <div
      className={`flex justify-between items-center px-5 py-2.5 border-l-[3px] cursor-pointer text-[13.5px] ${
        active ? "border-l-brass bg-paper2 text-ink font-semibold" : "border-l-transparent text-inkSoft hover:bg-paper2"
      }`}
    >
      <span>{label}</span>
      {count !== undefined && <span className="font-mono text-[11.5px] text-inkFaint bg-paper2 px-1.5">{count}</span>}
    </div>
  );
}
