"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useIsAdmin } from "@/lib/auth/useIsAdmin";
import { getAccountHomePath } from "@/lib/auth/useAccountRole";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const loading = authLoading || adminLoading;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (!isAdmin) {
      router.replace(getAccountHomePath(user.metadata.role));
    }
  }, [loading, user, isAdmin, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-orange-500" />
        <p className="text-sm">Verifying admin access…</p>
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-muted-foreground">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <p className="text-sm font-medium text-foreground">Admin access required</p>
        <p className="max-w-sm text-sm">Redirecting you back to your account…</p>
      </div>
    );
  }

  return <>{children}</>;
}
