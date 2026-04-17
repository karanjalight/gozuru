"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LogOut, UserRound } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This is a mock profile page for the logged-in user.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="rounded-2xl border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <UserRound className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">Signed in</p>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold">Account overview</h2>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>Manage applied experiences and payments from the tabs above.</p>
              <p>Update profile details when you connect a real backend.</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Actions</h2>

          <div className="mt-4 space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => router.push("/account/experiences")}
            >
              View experiences
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                logout();
                router.push("/auth/login");
              }}
            >
              <LogOut className="mr-2 size-4" />
              Log out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

