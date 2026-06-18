"use client";

import { useEffect } from "react";
import { captureReferralFromUrl } from "@/lib/affiliate/referral";

export function ReferralCapture() {
  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  return null;
}
