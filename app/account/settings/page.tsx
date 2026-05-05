"use client";

import { Card } from "@/components/ui/card";

export default function AccountSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account preferences and privacy options.
      </p>

      <Card className="mt-6 rounded-2xl border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Settings controls will appear here. You can start by updating your details from your profile.
        </p>
      </Card>
    </div>
  );
}
