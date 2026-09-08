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

const EXTRACTION_PROMPT = `You are reading a bookkeeping/tax document for a firm's intake process. Extract every meaningful labeled figure, date, name, or identifier you can find — this could be a Profit & Loss statement, a W-2, a 940, a 941, a bank statement, or something else entirely. Do not guess at anything not actually printed on the document.

Return ONLY a JSON array, no other text, in this exact shape:
[{"label": "Employer EIN", "value": "12-3456789"}, {"label": "Total wages", "value": "$84,200.00"}]

If you cannot read the document at all, return an empty array: []`;

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
    const raw = textBlock && "text" in textBlock ? textBlock.text : "[]";
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const fields: ExtractedField[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    await prisma.document.update({
      where: { id: documentId },
      data: { extractedFields: fields, extractionStatus: "EXTRACTED", extractionError: null },
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
