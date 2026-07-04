"use client";

import { useState } from "react";
import { ArrowDownLeft, CreditCard, Clock, RefreshCcw } from "lucide-react";
import { ADMIN_PAGE_SIZE, useAdminPayments } from "@/lib/admin/api";
import type { PaymentRow } from "@/lib/admin/types";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import {
  EmptyState,
  FilterChips,
  Pagination,
  SearchInput,
  StatCard,
  StatusBadge,
  useDebouncedValue,
} from "@/components/admin/ui/primitives";
import { formatDate, formatMoney } from "@/components/admin/ui/format";

const STATUS_FILTERS = [
  { value: null, label: "All" },
  { value: "succeeded", label: "Succeeded" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partially refunded" },
];

export default function AdminPaymentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const debounced = useDebouncedValue(search);

  const { data, isFetching } = useAdminPayments({ search: debounced, status, page });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totals = data?.totals ?? { succeeded: 0, pending: 0, refunded: 0 };

  const columns: Column<PaymentRow>[] = [
    {
      key: "payer",
      header: "Payment",
      render: (p) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate font-medium">{p.experience_title ?? "Payment"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {p.payer_name ?? "—"} → {p.payee_name ?? "—"}
          </p>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      render: (p) => <span className="capitalize text-muted-foreground">{p.provider ?? "—"}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (p) => <span className="font-semibold tabular-nums">{formatMoney(p.amount)}</span>,
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "date",
      header: "Date",
      render: (p) => <span className="text-muted-foreground">{formatDate(p.paid_at ?? p.created_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={CreditCard} accent="emerald" label="Collected (succeeded)" value={formatMoney(totals.succeeded)} />
        <StatCard icon={Clock} accent="amber" label="Pending" value={formatMoney(totals.pending)} />
        <StatCard icon={RefreshCcw} accent="rose" label="Refunded" value={formatMoney(totals.refunded)} />
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={isFetching && rows.length === 0}
        getRowKey={(p) => p.id}
        empty={<EmptyState icon={ArrowDownLeft} title="No payments found" description="Try a different search or filter." />}
        toolbar={
          <>
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search payments…" />
            <FilterChips options={STATUS_FILTERS} value={status} onChange={(v) => { setStatus(v); setPage(0); }} />
          </>
        }
        footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
      />
    </div>
  );
}
