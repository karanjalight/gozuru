import { supabase } from "@/lib/supabase/client";

const REFERRAL_STORAGE_KEY = "gozuru_referral_code";

export const CLIENT_SIGNUP_PATH = "/auth/client/signup";

export function normalizeReferralCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function captureReferralFromUrl(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const ref = normalizeReferralCode(params.get("ref"));
  if (ref) {
    localStorage.setItem(REFERRAL_STORAGE_KEY, ref);
  }
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFERRAL_STORAGE_KEY);
}

export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
}

export function buildReferralLink(referralCode: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const params = new URLSearchParams({ ref: referralCode.toUpperCase() });
  return `${base}${CLIENT_SIGNUP_PATH}?${params.toString()}`;
}

export function appendReferralQuery(href: string, referralCode?: string | null): string {
  const code = normalizeReferralCode(referralCode ?? getStoredReferralCode());
  if (!code) return href;

  const url = new URL(href, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  url.searchParams.set("ref", code);
  return `${url.pathname}${url.search}`;
}

export async function attributeStoredReferral(): Promise<boolean> {
  const code = getStoredReferralCode();
  if (!code) return false;

  const { data, error } = await supabase.rpc("attribute_referral", {
    p_referral_code: code,
  });

  if (error) {
    console.error("Failed to attribute referral:", error.message);
    return false;
  }

  const result = (data ?? {}) as { attributed?: boolean; reason?: string };
  if (result.attributed === true || result.reason === "already_referred") {
    clearStoredReferralCode();
    return true;
  }

  return false;
}

export function getActiveReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  const fromUrl = normalizeReferralCode(new URLSearchParams(window.location.search).get("ref"));
  if (fromUrl) return fromUrl;

  return getStoredReferralCode();
}
