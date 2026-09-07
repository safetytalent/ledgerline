import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client — used in Client Components (the login
 * form, sign-out button). Session is stored in cookies so the server
 * client above can read the same logged-in state.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
