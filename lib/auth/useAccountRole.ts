"use client";

import { useAuth } from "@/components/auth/AuthProvider";

export function useIsClientAccount() {
  const { user, loading } = useAuth();
  const role = user?.metadata.role?.trim().toLowerCase();
  const isClient = !user || role !== "expert";

  return { isClient, loading };
}

export function getAccountHomePath(role?: string): string {
  return role?.trim().toLowerCase() === "expert" ? "/account/experiences" : "/account/profile";
}
