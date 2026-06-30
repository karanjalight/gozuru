"use client";

import { useState } from "react";
import { BadgeCheck, Check, RotateCcw, X } from "lucide-react";
import {
  ADMIN_PAGE_SIZE,
  adminActions,
  useAdminHosts,
  useAdminMutation,
} from "@/lib/admin/api";
import type { HostRow } from "@/lib/admin/types";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import {
  Avatar,
  EmptyState,
  FilterChips,
  Pagination,
  SearchInput,
  StatusBadge,
  useDebouncedValue,
} from "@/components/admin/ui/primitives";
import { ActionMenu } from "@/components/admin/ui/ActionMenu";
import { formatDate, formatNumber } from "@/components/admin/ui/format";

const STATUS_FILTERS = [
  { value: null, label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "not_started", label: "Not started" },
];

export default function AdminHostsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const debounced = useDebouncedValue(search);

  const { data, isFetching } = useAdminHosts({ search: debounced, status, page });
  const mutation = useAdminMutation();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const setVerification = (userId: string, next: string) =>
    mutation.mutate(adminActions.setHostVerification(userId, next));

  const columns: Column<HostRow>[] = [
    {
      key: "host",
      header: "Host",
      render: (h) => (
        <div className="flex items-center gap-3">
          <Avatar name={h.name ?? h.email} src={h.avatar_path} />
          <div className="min-w-0">
            <p className="truncate font-medium">{h.name ?? "Unnamed host"}</p>
            <p className="truncate text-xs text-muted-foreground">{h.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "headline",
      header: "Expertise",
      render: (h) => (
        <div className="max-w-xs">
          <p className="truncate text-sm">{h.headline ?? h.expertise ?? "—"}</p>
          {h.years_experience != null && (
            <p className="text-xs text-muted-foreground">{h.years_experience} yrs experience</p>
          )}
        </div>
      ),
    },
    {
      key: "experiences",
      header: "Listings",
      align: "center",
      render: (h) => <span className="tabular-nums">{formatNumber(h.experiences_count)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (h) => <StatusBadge status={h.verification_status} />,
    },
    {
      key: "joined",
      header: "Joined",
      render: (h) => <span className="text-muted-foreground">{formatDate(h.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (h) => (
        <ActionMenu
          items={[
            {
              label: "Approve",
              icon: Check,
              disabled: h.verification_status === "approved",
              onClick: () => setVerification(h.user_id, "approved"),
            },
            {
              label: "Reject",
              icon: X,
              danger: true,
              disabled: h.verification_status === "rejected",
              onClick: () => setVerification(h.user_id, "rejected"),
            },
            {
              label: "Reset to pending",
              icon: RotateCcw,
              disabled: h.verification_status === "pending",
              onClick: () => setVerification(h.user_id, "pending"),
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
      getRowKey={(h) => h.user_id}
      empty={
        <EmptyState
          icon={BadgeCheck}
          title="No hosts found"
          description="Try a different search or filter."
        />
      }
      toolbar={
        <>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search hosts…" />
          <FilterChips
            options={STATUS_FILTERS}
            value={status}
            onChange={(v) => { setStatus(v); setPage(0); }}
          />
        </>
      }
      footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
    />
  );
}
