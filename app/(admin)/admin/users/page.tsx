"use client";

import { useState } from "react";
import { ShieldCheck, ShieldOff, Users } from "lucide-react";
import {
  ADMIN_PAGE_SIZE,
  adminActions,
  useAdminMutation,
  useAdminUsers,
} from "@/lib/admin/api";
import type { UserRow } from "@/lib/admin/types";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import {
  Avatar,
  EmptyState,
  Pagination,
  SearchInput,
  useDebouncedValue,
} from "@/components/admin/ui/primitives";
import { ActionMenu } from "@/components/admin/ui/ActionMenu";
import { formatDate, formatNumber } from "@/components/admin/ui/format";
import { cn } from "@/lib/utils";

function RoleTag({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", className)}>
      {label}
    </span>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debounced = useDebouncedValue(search);

  const { data, isFetching } = useAdminUsers({ search: debounced, page });
  const mutation = useAdminMutation();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const columns: Column<UserRow>[] = [
    {
      key: "user",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name ?? u.email} src={u.avatar_path} />
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name ?? "Unnamed"}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (u) => (
        <span className="text-muted-foreground">
          {[u.city, u.country_code].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      render: (u) => (
        <div className="flex flex-wrap gap-1.5">
          {u.is_admin && <RoleTag label="Admin" className="bg-orange-500/15 text-orange-600" />}
          {u.is_host && <RoleTag label="Host" className="bg-violet-500/15 text-violet-600" />}
          {u.is_affiliate && <RoleTag label="Affiliate" className="bg-sky-500/15 text-sky-600" />}
          {!u.is_admin && !u.is_host && !u.is_affiliate && (
            <RoleTag label="Member" className="bg-muted text-muted-foreground" />
          )}
        </div>
      ),
    },
    {
      key: "bookings",
      header: "Bookings",
      align: "center",
      render: (u) => <span className="tabular-nums">{formatNumber(u.bookings_count)}</span>,
    },
    {
      key: "joined",
      header: "Joined",
      render: (u) => <span className="text-muted-foreground">{formatDate(u.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) => (
        <ActionMenu
          items={[
            u.is_admin
              ? {
                  label: "Revoke admin",
                  icon: ShieldOff,
                  danger: true,
                  onClick: () => mutation.mutate(adminActions.setAdminRole(u.user_id, false)),
                }
              : {
                  label: "Make admin",
                  icon: ShieldCheck,
                  onClick: () => mutation.mutate(adminActions.setAdminRole(u.user_id, true)),
                },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={isFetching && rows.length === 0}
      getRowKey={(u) => u.user_id}
      empty={<EmptyState icon={Users} title="No users found" description="Try a different search." />}
      toolbar={
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Search by name or email…"
        />
      }
      footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
    />
  );
}
