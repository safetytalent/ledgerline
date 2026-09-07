import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/qbo/client";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { verifySignedState } from "@/lib/qbo/state";

/**
 * GET /api/qbo/callback
 *
 * Intuit redirects here after the client approves the connection.
 * Query params include: code, state (signed clientId — see lib/qbo/state.ts),
 * realmId.
 *
 * Tokens are encrypted (AES-256-GCM, see lib/crypto.ts) before they ever
 * touch the database. `state` is verified against the HMAC signature
 * added in app/api/qbo/connect/route.ts, so a guessed or forged clientId
 * can't hijack this callback.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const realmId = req.nextUrl.searchParams.get("realmId");

  if (!code || !state || !realmId) {
    return NextResponse.json({ error: "Missing code, state, or realmId" }, { status: 400 });
  }

  const clientId = verifySignedState(state);
  if (!clientId) {
    return NextResponse.json({ error: "Invalid or tampered state parameter" }, { status: 400 });
  }

  const tokens = await exchangeCodeForTokens(code);

  await prisma.client.update({
    where: { id: clientId },
    data: {
      qboRealmId: realmId,
      qboTokens: {
        upsert: {
          create: {
            accessToken: encryptSecret(tokens.access_token),
            refreshToken: encryptSecret(tokens.refresh_token),
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          },
          update: {
            accessToken: encryptSecret(tokens.access_token),
            refreshToken: encryptSecret(tokens.refresh_token),
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          },
        },
      },
    },
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
