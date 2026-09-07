import { NextRequest, NextResponse } from "next/server";
import { getQboAuthUrl } from "@/lib/qbo/client";
import { signState } from "@/lib/qbo/state";

/**
 * GET /api/qbo/connect?clientId=<our internal client id>
 *
 * Starts the QBO OAuth flow for a given client record. The `state`
 * param round-trips our internal client id through Intuit's OAuth
 * screen, signed (see lib/qbo/state.ts) so the callback can trust it —
 * a guessed or forged client id will fail verification instead of
 * hijacking someone else's QBO connection.
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  const authUrl = getQboAuthUrl(signState(clientId));
  return NextResponse.redirect(authUrl);
}
