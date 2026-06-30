"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Database, Moon, ShieldCheck, Sun, UserCog } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SectionCard, Avatar } from "@/components/admin/ui/primitives";
import { cn } from "@/lib/utils";

const GRANT_SQL = `insert into public.user_roles (user_id, role)
select user_id, 'admin'::public.app_role
from public.profiles
where email = 'someone@example.com'
on conflict (user_id, role) do nothing;`;

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fullName = `${user?.metadata.firstName ?? ""} ${user?.metadata.lastName ?? ""}`.trim();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Administrator" description="Your account">
        <div className="flex items-center gap-4">
          <Avatar name={fullName || user?.email} src={user?.metadata.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{fullName || "Administrator"}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-600">
            <ShieldCheck className="size-3.5" /> Admin
          </span>
        </div>
      </SectionCard>

      <SectionCard title="Appearance" description="Theme preference">
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((opt) => {
            const active = mounted && theme === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setTheme(opt)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition",
                  active
                    ? "border-orange-400 bg-orange-500/10 text-orange-600"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {opt === "light" ? <Sun className="size-4" /> : opt === "dark" ? <Moon className="size-4" /> : <UserCog className="size-4" />}
                {opt}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        className="lg:col-span-2"
        title="Access management"
        description="Promote another account to admin"
      >
        <p className="text-sm text-muted-foreground">
          Admin access is controlled by the <code className="rounded bg-muted px-1.5 py-0.5 text-xs">user_roles</code> table
          and resolved via the <code className="rounded bg-muted px-1.5 py-0.5 text-xs">is_admin()</code> function. You can
          grant admin to a teammate from the Users page, or run this in the Supabase SQL editor:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed">
          <code>{GRANT_SQL}</code>
        </pre>
      </SectionCard>

      <SectionCard
        className="lg:col-span-2"
        title="Database"
        description="Dashboard data source"
      >
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
            <Database className="size-4" />
          </span>
          <p>
            All metrics, lists and moderation actions are powered by the
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">admin_*</code>
            Postgres functions in migration
            <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">20260629_021_admin_dashboard.sql</code>.
            Each function is gated by <code className="rounded bg-muted px-1.5 py-0.5 text-xs">is_admin()</code>, so only
            admins can read aggregates or perform actions. Apply that migration to your Supabase project if the dashboard
            shows an error.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
