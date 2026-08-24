"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  Check,
  Copy,
  Database,
  KeyRound,
  Moon,
  ShieldCheck,
  Sun,
  UserCog,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SectionCard, Avatar } from "@/components/admin/ui/primitives";
import { formatDate } from "@/components/admin/ui/format";
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
        <div className="flex items-start gap-4">
          <Avatar name={fullName || user?.email} src={user?.metadata.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold">{fullName || "Administrator"}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-600">
                <ShieldCheck className="size-3.5" /> Admin
              </span>
            </div>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            {user?.createdAt && (
              <p className="mt-1 text-xs text-muted-foreground/80">
                Member since {formatDate(user.createdAt)}
              </p>
            )}
          </div>
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

      <AdvancedSettings />
    </div>
  );
}

function AdvancedSettings() {
  const [copied, setCopied] = useState(false);

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(GRANT_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — the code block is still selectable manually
    }
  };

  return (
    <details className="group lg:col-span-2 overflow-hidden rounded-2xl border border-border/70 bg-card ring-1 ring-foreground/[0.03]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Advanced</h3>
          <p className="text-xs text-muted-foreground">Access management and dashboard data source</p>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-6 border-t border-border/60 px-5 py-5">
        <div>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
              <KeyRound className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Access management</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Admin access is controlled by the <code className="rounded bg-muted px-1.5 py-0.5 text-xs">user_roles</code> table
                and resolved via the <code className="rounded bg-muted px-1.5 py-0.5 text-xs">is_admin()</code> function.
              </p>
              <Link
                href="/admin/users"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                <Users className="size-3.5" /> Promote a user from the Users page
              </Link>
            </div>
          </div>

          <div className="relative mt-3 ml-12">
            <p className="mb-1.5 text-xs text-muted-foreground">Or run this in the Supabase SQL editor:</p>
            <pre className="overflow-x-auto rounded-xl border border-border bg-muted/40 p-4 pr-11 text-xs leading-relaxed">
              <code>{GRANT_SQL}</code>
            </pre>
            <button
              type="button"
              onClick={copySql}
              className="absolute right-2 top-8 inline-flex size-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Copy SQL"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
            <Database className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Database</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Metrics, lists and moderation actions run through the
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">admin_*</code>
              Postgres functions, each gated by
              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">is_admin()</code>
              so only admins can read aggregates or perform actions.
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}
