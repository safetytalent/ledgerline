"use client";

import { useState, useTransition } from "react";
import { verifyExtraction, retryExtraction } from "@/app/dashboard/documents/actions";
import type { ExtractedField } from "@/lib/agents/intake-agent";

const STATUS_LABEL: Record<string, string> = {
  NOT_EXTRACTED: "NOT YET READ",
  EXTRACTED: "AI READ — NEEDS REVIEW",
  VERIFIED: "VERIFIED",
  FAILED: "COULD NOT READ",
};

const STATUS_STYLE: Record<string, string> = {
  NOT_EXTRACTED: "bg-paper2 text-inkFaint",
  EXTRACTED: "bg-brassSoft text-brassDeep",
  VERIFIED: "bg-tealSoft text-teal",
  FAILED: "bg-rustSoft text-rust",
};

export default function ExtractionPanel({
  documentId,
  status,
  fields,
  error,
  noticeSummary,
  requiresLegalReview,
}: {
  documentId: string;
  status: string;
  fields: ExtractedField[] | null;
  error: string | null;
  noticeSummary: string | null;
  requiresLegalReview: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ExtractedField[]>(fields ?? []);
  const [isPending, startTransition] = useTransition();

  function updateValue(i: number, value: string) {
    setDraft((prev) => prev.map((f, idx) => (idx === i ? { ...f, value } : f)));
  }

  function submit() {
    startTransition(() => verifyExtraction(documentId, draft));
  }

  function retry() {
    startTransition(() => retryExtraction(documentId));
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`font-mono text-[10px] px-1.5 py-0.5 whitespace-nowrap ${
          requiresLegalReview ? "bg-rustSoft text-rust" : STATUS_STYLE[status] ?? ""
        }`}
      >
        {requiresLegalReview ? "IRS/STATE NOTICE — NEEDS PREPARER" : STATUS_LABEL[status] ?? status}
      </button>

      {open && requiresLegalReview && (
        <div className="mt-2 border border-rust bg-rustSoft p-3 max-w-md">
          <div className="text-[11px] font-semibold text-rust mb-1.5">
            Notice Triage Agent — route to a preparer or attorney
          </div>
          <p className="text-[12px] text-inkSoft whitespace-pre-wrap">
            {noticeSummary ?? "This looks like an IRS or state notice, but no summary could be read."}
          </p>
          <p className="text-[11px] text-rust italic mt-2">
            This agent never drafts a response — always escalate to a credentialed preparer or
            attorney.
          </p>
        </div>
      )}

      {open && !requiresLegalReview && (
        <div className="mt-2 border border-line bg-white p-3 max-w-md">
          {status === "FAILED" && (
            <div className="mb-2">
              <p className="text-[12px] text-rust mb-2">{error ?? "Extraction failed."}</p>
              <button onClick={retry} disabled={isPending} className="text-[12px] text-brass underline">
                Retry extraction
              </button>
            </div>
          )}

          {status === "NOT_EXTRACTED" && (
            <div className="mb-2">
              <p className="text-[12px] text-inkFaint mb-2">
                This document hasn't been read yet.
              </p>
              <button onClick={retry} disabled={isPending} className="text-[12px] text-brass underline">
                {isPending ? "Reading..." : "Read this document now"}
              </button>
            </div>
          )}

          {(status === "EXTRACTED" || status === "VERIFIED") && (
            <>
              {draft.length === 0 ? (
                <p className="text-[12px] text-inkFaint mb-2">
                  The AI didn't find any labeled fields in this document.
                </p>
              ) : (
                <div className="mb-3">
                  {draft.map((f, i) => (
                    <div key={i} className="grid grid-cols-[120px_1fr] gap-2 items-center mb-1.5">
                      <span className="text-[11px] text-inkSoft font-medium truncate">{f.label}</span>
                      <input
                        value={f.value}
                        disabled={status === "VERIFIED"}
                        onChange={(e) => updateValue(i, e.target.value)}
                        className="text-[12px] border border-line px-1.5 py-1 disabled:bg-paper2 disabled:text-inkFaint"
                      />
                    </div>
                  ))}
                </div>
              )}
              {status === "EXTRACTED" ? (
                <button
                  onClick={submit}
                  disabled={isPending}
                  className="text-[12px] font-semibold bg-ink text-paper px-3 py-1.5"
                >
                  Verify & submit
                </button>
              ) : (
                <p className="text-[11px] text-teal">Confirmed and on record.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
