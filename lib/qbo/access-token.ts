import { prisma } from "@/lib/db";
import { refreshAccessToken } from "@/lib/qbo/client";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

/**
 * Returns a valid, decrypted access token for a client — refreshing
 * and re-saving it first if the stored one has expired. QBO access
 * tokens are short-lived (about 1 hour), so this runs often. Shared
 * by both the webhook and the pull-sync route.
 */
export async function getValidAccessToken(clientId: string): Promise<string | null> {
  const conn = await prisma.qboConnection.findUnique({ where: { clientId } });
  if (!conn) return null;

  if (conn.expiresAt > new Date()) {
    return decryptSecret(conn.accessToken);
  }

  const refreshToken = decryptSecret(conn.refreshToken);
  const tokens = await refreshAccessToken(refreshToken);

  await prisma.qboConnection.update({
    where: { clientId },
    data: {
      accessToken: encryptSecret(tokens.access_token),
      refreshToken: encryptSecret(tokens.refresh_token),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return tokens.access_token;
}
