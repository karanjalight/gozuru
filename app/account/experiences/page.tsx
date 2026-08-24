"use client";

import { ClientExperiencesBrowser } from "@/components/account/ClientExperiencesBrowser";
import { HostExperiencesManager } from "@/components/account/HostExperiencesManager";
import { useAuth } from "@/components/auth/AuthProvider";
import { useIsClientAccount } from "@/lib/auth/useAccountRole";

export default function ExperiencesPage() {
  const { loading: authLoading } = useAuth();
  const { isClient } = useIsClientAccount();

  if (authLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="animate-pulse space-y-3">
              <div className="aspect-[4/3] rounded-xl bg-muted" />
              <div className="h-4 w-2/3 rounded-lg bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return isClient ? <ClientExperiencesBrowser /> : <HostExperiencesManager />;
}
