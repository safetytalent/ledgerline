import { prisma } from "@/lib/db";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Intake Agent — the Phase F task that got missed the first time
 * around: "turn uploaded documents/questionnaires into a structured
 * organizer; flag missing items." This works for every client, on
 * QuickBooks or not, individual or entity — a P&L, W-2, 940, 941,
 * bank statement, whatever gets uploaded.
 *
 * It never writes anything a human hasn't seen: extraction fills
 * Document.extractedFields and sets status to EXTRACTED, which is
 * still just the AI's first-pass read. Nothing downstream (tax prep,
 * reports, anything) may treat these numbers as real until a human
 * calls verifyExtraction() — the same draft-then-approve pattern
 * used everywhere else in this app.
 */

function supabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type ExtractedField = {
  label: string;
  value: string;
};

const EXTRACTION_PROMPT = `You are reading a document for a bookkeeping/tax firm's intake process. First, decide whether this is an IRS or state tax authority NOTICE (a letter about a filing, balance, audit, or account issue) as opposed to an ordinary bookkeeping document (P&L, W-2, 940, 941, bank statement, etc.).

Return ONLY a JSON object, no other text, in this exact shape:
{"isNotice": false, "noticeSummary": null, "fields": [{"label": "Employer EIN", "value": "12-3456789"}]}

If it IS a notice: set "isNotice" to true, write a short plain-English summary of what the notice says and what it's asking for in "noticeSummary" (2-4 sentences, no legal advice, no suggested response), and leave "fields" as an empty array — a notice's content is a summary, not a field list.

If it is NOT a notice: set "isNotice" to false, "noticeSummary" to null, and extract every meaningful labeled figure, date, name, or identifier into "fields". Do not guess at anything not actually printed on the document.

If you cannot read the document at all, return {"isNotice": false, "noticeSummary": null, "fields": []}`;

/**
 * Downloads the file from Supabase Storage and sends it to Claude to
 * read. PDF and image types are supported directly as document/image
 * content blocks — anything else falls back to a FAILED status
 * rather than guessing at content Claude never actually saw.
 */
export async function extractDocumentFields(documentId: string): Promise<void> {
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });

  try {
    const { data, error } = await supabaseAdmin()
      .storage.from("documents")
      .download(doc.storagePath);
    if (error || !data) throw new Error(error?.message ?? "Could not download file from storage");

    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = data.type || guessMediaType(doc.fileName);

    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(mediaType)) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          extractionStatus: "FAILED",
          extractionError: `Unsupported file type for extraction: ${mediaType || "unknown"}`,
        },
      });
      return;
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const contentBlock: Anthropic.ContentBlockParam =
      mediaType === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/png" | "image/jpeg" | "image/webp",
              data: base64,
            },
          };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: EXTRACTION_PROMPT }],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed: { isNotice?: boolean; noticeSummary?: string | null; fields?: ExtractedField[] } =
      jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedFields: parsed.fields ?? [],
        extractionStatus: "EXTRACTED",
        extractionError: null,
        // Notice Triage Agent: this document reads as an IRS/state
        // notice — always flagged for a human to route to a
        // preparer or attorney, never given a drafted response.
        noticeSummary: parsed.isNotice ? parsed.noticeSummary ?? null : null,
        requiresLegalReview: !!parsed.isNotice,
      },
    });
  } catch (err) {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractionStatus: "FAILED",
        extractionError: err instanceof Error ? err.message : "Unknown extraction error",
      },
    });
  }
}

function guessMediaType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "unknown";
  }
}
