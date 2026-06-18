import { supabase } from "@/lib/supabase/client";
import { getAccountHomePath } from "@/lib/auth/useAccountRole";

const PENDING_AFFILIATE_ENROLLMENT_KEY = "gozuru_pending_affiliate_enrollment";

export function setPendingAffiliateEnrollment(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_AFFILIATE_ENROLLMENT_KEY, "true");
}

export function clearPendingAffiliateEnrollment(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_AFFILIATE_ENROLLMENT_KEY);
}

export function hasPendingAffiliateEnrollment(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PENDING_AFFILIATE_ENROLLMENT_KEY) === "true";
}

export async function enrollAsAffiliate(): Promise<void> {
  const { error } = await supabase.rpc("enroll_as_affiliate");
  if (error) {
    throw new Error(error.message);
  }

  clearPendingAffiliateEnrollment();
  window.dispatchEvent(new CustomEvent("gozuru-affiliate-enrolled"));
}

export async function processPendingAffiliateEnrollment(): Promise<boolean> {
  if (!hasPendingAffiliateEnrollment()) {
    return false;
  }

  try {
    await enrollAsAffiliate();
    return true;
  } catch (error) {
    console.error("Failed to complete pending affiliate enrollment:", error);
    return false;
  }
}

export function getClientPostSignupPath(signUpAsAffiliate: boolean): string {
  return signUpAsAffiliate ? "/account/affiliate" : "/account/profile";
}

export async function resolveClientPostAuthPath(role?: string): Promise<string> {
  const enrolledFromPending = await processPendingAffiliateEnrollment();
  if (enrolledFromPending) {
    return "/account/affiliate";
  }

  return getAccountHomePath(role);
}
