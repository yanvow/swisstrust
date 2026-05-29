import { createBrowserClient } from "@supabase/ssr";

type Client = ReturnType<typeof createBrowserClient>;

// Cache the browser client so repeated createClient() calls inside handlers
// don't re-instantiate. Lazy: only constructed on first call (never during
// SSR/prerender).
let cached: Client | null = null;

export function createClient(): Client {
  if (cached) return cached;
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return cached;
}
