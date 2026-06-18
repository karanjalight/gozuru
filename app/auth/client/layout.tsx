import { Suspense } from "react";
import { ClientAuthShell } from "@/components/auth/ClientAuthShell";

export default function ClientAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <ClientAuthShell>{children}</ClientAuthShell>
    </Suspense>
  );
}
