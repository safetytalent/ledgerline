import jwt from "jsonwebtoken";

/**
 * Phase J — DocuSign integration via the JWT Grant flow (server-to-
 * server, no per-user login needed). Requires these env vars, none
 * of which exist yet — this code is real and correct against
 * DocuSign's documented API, but won't actually send anything until
 * a real DocuSign integration key and RSA keypair are added:
 *
 *   DOCUSIGN_INTEGRATION_KEY  — the app's Integration Key (client_id)
 *   DOCUSIGN_USER_ID          — the API user's GUID
 *   DOCUSIGN_ACCOUNT_ID       — the DocuSign account id to send from
 *   DOCUSIGN_PRIVATE_KEY      — RSA private key (PEM), for JWT signing
 *   DOCUSIGN_BASE_URL         — https://demo.docusign.net (sandbox)
 *                                or https://www.docusign.net (production)
 *   DOCUSIGN_AUTH_SERVER      — account-d.docusign.com (sandbox)
 *                                or account.docusign.com (production)
 */

async function getAccessToken(): Promise<string> {
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  const authServer = process.env.DOCUSIGN_AUTH_SERVER ?? "account-d.docusign.com";

  if (!privateKey || !integrationKey || !userId) {
    throw new Error(
      "DocuSign isn't configured yet — DOCUSIGN_PRIVATE_KEY, DOCUSIGN_INTEGRATION_KEY, and DOCUSIGN_USER_ID must be set before e-signature requests can be sent."
    );
  }

  const assertion = jwt.sign(
    {
      iss: integrationKey,
      sub: userId,
      aud: authServer,
      scope: "signature impersonation",
    },
    privateKey,
    { algorithm: "RS256", expiresIn: "1h" }
  );

  const res = await fetch(`https://${authServer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    throw new Error(`DocuSign token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Sends one document for signature. The document content here is a
 * plain-text rendering of the form's real auto-filled fields — not a
 * fabricated IRS form image. Producing an actual visually-correct
 * IRS form layout for signing is Phase K's job (sourcing the
 * current tax-year form), not this integration's.
 */
export async function sendEnvelopeForSignature(params: {
  recipientEmail: string;
  recipientName: string;
  documentTitle: string;
  documentText: string;
}): Promise<{ envelopeId: string }> {
  const accessToken = await getAccessToken();
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const baseUrl = process.env.DOCUSIGN_BASE_URL ?? "https://demo.docusign.net";

  if (!accountId) {
    throw new Error("DOCUSIGN_ACCOUNT_ID isn't set — refusing to send without a real account to send from.");
  }

  const documentBase64 = Buffer.from(params.documentText, "utf-8").toString("base64");

  const res = await fetch(`${baseUrl}/restapi/v2.1/accounts/${accountId}/envelopes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emailSubject: `Please sign: ${params.documentTitle}`,
      documents: [
        {
          documentBase64,
          name: params.documentTitle,
          fileExtension: "txt",
          documentId: "1",
        },
      ],
      recipients: {
        signers: [
          {
            email: params.recipientEmail,
            name: params.recipientName,
            recipientId: "1",
            tabs: {
              signHereTabs: [{ documentId: "1", pageNumber: "1", xPosition: "100", yPosition: "100" }],
            },
          },
        ],
      },
      status: "sent",
    }),
  });

  if (!res.ok) {
    throw new Error(`DocuSign envelope creation failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return { envelopeId: data.envelopeId };
}
