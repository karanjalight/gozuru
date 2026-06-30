"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { ADMIN_PAGE_SIZE, useAdminAffiliates } from "@/lib/admin/api";
import type { AffiliateRow } from "@/lib/admin/types";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import {
  Avatar,
  EmptyState,
  Pagination,
  SearchInput,
  useDebouncedValue,
} from "@/components/admin/ui/primitives";
import { formatDate, formatMoney, formatNumber } from "@/components/admin/ui/format";

export default function AdminAffiliatesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debounced = useDebouncedValue(search);

  const { data, isFetching } = useAdminAffiliates({ search: debounced, page });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const columns: Column<AffiliateRow>[] = [
    {
      key: "affiliate",
      header: "Affiliate",
      render: (a) => (
        <div className="flex items-center gap-3">
          <Avatar name={a.name ?? a.email} />
          <div className="min-w-0">
            <p className="truncate font-medium">{a.name ?? "Unnamed"}</p>
            <p className="truncate text-xs text-muted-foreground">{a.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "code",
      header: "Code",
      render: (a) => (
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold">{a.referral_code}</span>
      ),
    },
    {
      key: "referrals",
      header: "Referrals",
      align: "center",
      render: (a) => <span className="tabular-nums">{formatNumber(a.referrals_count)}</span>,
    },
    {
      key: "earned",
      header: "Total earned",
      align: "right",
      render: (a) => <span className="font-semibold tabular-nums">{formatMoney(a.total_earned)}</span>,
    },
    {
      key: "pending",
      header: "Pending cashout",
      align: "right",
      render: (a) => <span className="tabular-nums text-muted-foreground">{formatMoney(a.pending_cashout)}</span>,
    },
    {
      key: "enrolled",
      header: "Joined",
      render: (a) => <span className="text-muted-foreground">{formatDate(a.enrolled_at)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={isFetching && rows.length === 0}
      getRowKey={(a) => a.user_id}
      empty={<EmptyState icon={Share2} title="No affiliates found" description="Referral partners will appear here." />}
      toolbar={
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Search affiliates or code…"
        />
      }
      footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
    />
  );
}
