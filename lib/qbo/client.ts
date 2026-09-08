/**
 * Thin wrapper around QuickBooks Online's OAuth2 + REST API.
 *
 * Deliberately not using a heavy SDK here — QBO's API surface for what
 * we need (OAuth token exchange, refresh, and pulling transactions) is
 * small enough that a thin fetch wrapper is easier to reason about and
 * debug than a black-box library.
 *
 * Docs: https://developer.intuit.com/app/developer/qbo/docs/get-started
 */

const QBO_ENV = process.env.QBO_ENVIRONMENT ?? "sandbox";
const AUTH_BASE = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const API_BASE =
  QBO_ENV === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

export function getQboAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID!,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: process.env.QBO_REDIRECT_URI!,
    state,
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const basicAuth = Buffer.from(
    `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.QBO_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    throw new Error(`QBO token exchange failed: ${res.status} ${await res.text()}`);
  }

  // { access_token, refresh_token, expires_in, ... }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const basicAuth = Buffer.from(
    `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`QBO token refresh failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

/**
 * Fetch one specific transaction by its QBO entity type + id — this is
 * what the webhook calls to replace the placeholder vendor/amount with
 * real data. `entityType` comes straight from the webhook payload
 * (e.g. "Purchase", "Bill", "Deposit").
 */
export async function fetchEntityById(
  realmId: string,
  accessToken: string,
  entityType: string,
  id: string
) {
  const query = encodeURIComponent(`select * from ${entityType} where Id = '${id}'`);
  const res = await fetch(`${API_BASE}/v3/company/${realmId}/query?query=${query}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`QBO ${entityType} fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data?.QueryResponse?.[entityType]?.[0] ?? null;
}

/**
 * Extracts { vendorName, amount, txnDate } from a raw QBO entity.
 * Purchase and Bill are the two transaction types this handles fully
 * (the common case: a vendor payment or bill needing categorization).
 * Other entity types (Deposit, Invoice, etc.) fall back to a generic
 * label — real support for those is a Phase 2 addition, not silently
 * guessed at.
 */
export function extractTransactionFields(entityType: string, entity: any) {
  const txnDate = entity?.TxnDate ? new Date(entity.TxnDate) : new Date();
  const amount = Number(entity?.TotalAmt ?? 0);

  if (entityType === "Purchase" || entityType === "Bill") {
    const vendorName =
      entity?.EntityRef?.name ?? entity?.VendorRef?.name ?? "Unknown Vendor";
    return { vendorName, amount, txnDate, txnType: "EXPENSE" as const };
  }

  if (entityType === "Invoice" || entityType === "SalesReceipt") {
    const customerName = entity?.CustomerRef?.name ?? "Unknown Customer";
    return { vendorName: customerName, amount, txnDate, txnType: "INCOME" as const };
  }

  if (entityType === "Deposit") {
    // Deposits often don't carry a customer reference — they can be a
    // lump bank deposit covering several sources. Fall back to a plain
    // label rather than guessing at who it was from.
    const source = entity?.Line?.[0]?.DepositLineDetail?.Entity?.name ?? "Bank Deposit";
    return { vendorName: source, amount, txnDate, txnType: "INCOME" as const };
  }

  return { vendorName: `${entityType} (unsupported type)`, amount, txnDate, txnType: "EXPENSE" as const };
}


export async function fetchRecentTransactions(realmId: string, accessToken: string) {
  const query = encodeURIComponent(
    "select * from Purchase where MetaData.LastUpdatedTime > '2024-01-01' maxresults 100"
  );
  const res = await fetch(`${API_BASE}/v3/company/${realmId}/query?query=${query}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`QBO transaction fetch failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
