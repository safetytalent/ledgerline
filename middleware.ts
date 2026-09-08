import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before every matched request. Refreshes the Supabase session
 * cookie and redirects to /login if the user isn't authenticated and
 * is trying to reach a protected page. This is what actually stops
 * an unauthenticated visitor from loading the dashboard directly —
 * without this, the dashboard page itself has no gate on it.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isAuthPage) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  // Protect everything except static assets, images, and the three
  // kinds of routes that must stay reachable with no user session:
  // QBO's OAuth/webhook callbacks, Stripe's webhook, and DocuSign's
  // Connect webhook (none of these have a Ledgerline login).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/qbo|api/billing/webhook|api/docusign/webhook).*)",
  ],
};
