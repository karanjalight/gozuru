"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthProvider";
import { checkIsAdmin } from "@/lib/auth/admin";

export { checkIsAdmin };

export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["is-admin", user?.id ?? null],
    enabled: Boolean(user) && !authLoading,
    queryFn: checkIsAdmin,
    staleTime: 1000 * 60 * 5,
  });

  return {
    isAdmin: query.data === true,
    loading: authLoading || (Boolean(user) && query.isLoading),
  };
}
