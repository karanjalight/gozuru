import { supabase } from "@/lib/supabase/client";

/**
 * Resolves admin status from the canonical source: an 'admin' row in
 * public.user_roles, surfaced through the public.is_admin() RPC. The metadata
 * role ("client"/"expert") is unrelated to admin access.
 *
 * Kept in a leaf module (supabase-only) so it can be used both by the
 * post-login router and the React hook without creating an import cycle.
 */
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    console.error("Failed to resolve admin status:", error.message);
    return false;
  }
  return Boolean(data);
}
