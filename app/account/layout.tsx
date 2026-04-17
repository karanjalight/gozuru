"use client";

import { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AccountTopNav } from "@/components/navigation/AccountTopNav";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-background text-foreground">
        <AccountTopNav />
        <main className="pt-20">{children}</main>
      </div>
    </RequireAuth>
  );
}

