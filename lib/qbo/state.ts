/**
 * Signs and verifies the OAuth `state` parameter for the QBO connect
 * flow. Without this, `state` is just a raw client id — anyone who
 * guesses or enumerates a client id could redirect Intuit's callback
 * at it and attach their own QBO connection to someone else's client
 * record. Signing it with HMAC means only our server could have
 * produced a valid state for a given clientId.
 *
 * Uses the same ENCRYPTION_KEY as lib/crypto.ts so there's only one
 * secret to provision — HMAC and AES-GCM keys don't need to be
 * different for this to be secure.
 */
import crypto from "crypto";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not set — required to sign the OAuth state param.");
  }
  return Buffer.from(raw, "base64");
}

export function signState(clientId: string): string {
  const nonce = crypto.randomBytes(8).toString("base64url");
  const payload = `${clientId}.${nonce}`;
  const signature = crypto.createHmac("sha256", getKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySignedState(state: string): string | null {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [clientId, nonce, signature] = parts;

  const payload = `${clientId}.${nonce}`;
  const expected = crypto.createHmac("sha256", getKey()).update(payload).digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  return clientId;
}
