"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";

export function useAffiliateStatus() {
  const { user, loading: authLoading } = useAuth();
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      queueMicrotask(() => {
        setIsAffiliate(false);
        setLoading(false);
      });
      return;
    }

    let mounted = true;

    const loadStatus = async () => {
      try {
        const { data, error } = await supabase.rpc("is_affiliate");
        if (!mounted) return;
        if (error) {
          console.error("Failed to load affiliate status:", error.message);
          setIsAffiliate(false);
          return;
        }
        setIsAffiliate(Boolean(data));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadStatus();

    const onEnrolled = () => {
      setIsAffiliate(true);
      setLoading(false);
    };

    window.addEventListener("gozuru-affiliate-enrolled", onEnrolled);

    return () => {
      mounted = false;
      window.removeEventListener("gozuru-affiliate-enrolled", onEnrolled);
    };
  }, [authLoading, user]);

  return { isAffiliate, loading: authLoading || loading };
}
