/**
 * One-time setup: creates the "documents" Storage bucket in Supabase
 * if it doesn't already exist. Run once with:
 *   npx tsx scripts/setup-storage.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env manually so this script works without adding a new
// dependency — Next.js loads .env automatically at runtime, but a
// standalone script run via `npx tsx` needs to do it itself.
function loadEnv() {
  for (const fileName of [".env", ".env.local"]) {
    const envPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, "utf-8").replace(/\r/g, "");
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      value = value.replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}
loadEnv();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    console.error("Keys found in .env:", Object.keys(process.env).filter(
      (k) => k.startsWith("NEXT_PUBLIC_") || k.startsWith("SUPABASE_") || k.startsWith("DATABASE_")
    ));
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data: existing } = await supabase.storage.listBuckets();

  if (existing?.some((b) => b.name === "documents")) {
    console.log("Bucket 'documents' already exists — nothing to do.");
    return;
  }

  const { error } = await supabase.storage.createBucket("documents", {
    public: false,
  });

  if (error) {
    console.error("Failed to create bucket:", error.message);
    process.exit(1);
  }

  console.log("Created 'documents' bucket successfully.");
}

main();
