"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { ADMIN_PAGE_SIZE, useAdminBookings } from "@/lib/admin/api";
import type { BookingRow } from "@/lib/admin/types";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import {
  EmptyState,
  FilterChips,
  Pagination,
  SearchInput,
  StatusBadge,
  useDebouncedValue,
} from "@/components/admin/ui/primitives";
import { formatDateTime, formatMoney, formatNumber } from "@/components/admin/ui/format";

const STATUS_FILTERS = [
  { value: null, label: "All" },
  { value: "requested", label: "Requested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled_by_guest", label: "Cancelled (guest)" },
  { value: "cancelled_by_host", label: "Cancelled (host)" },
  { value: "refunded", label: "Refunded" },
  { value: "no_show", label: "No-show" },
];

export default function AdminBookingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const debounced = useDebouncedValue(search);

  const { data, isFetching } = useAdminBookings({ search: debounced, status, page });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const columns: Column<BookingRow>[] = [
    {
      key: "experience",
      header: "Experience",
      render: (b) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate font-medium">{b.experience_title ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">Host: {b.host_name ?? "—"}</p>
        </div>
      ),
    },
    { key: "guest", header: "Guest", render: (b) => <span className="truncate text-sm">{b.guest_name ?? "—"}</span> },
    {
      key: "guests",
      header: "Guests",
      align: "center",
      render: (b) => <span className="tabular-nums">{formatNumber(b.guests_count)}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (b) => <span className="font-medium tabular-nums">{formatMoney(b.total_amount)}</span>,
    },
    { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
    {
      key: "date",
      header: "Booked",
      render: (b) => <span className="text-muted-foreground">{formatDateTime(b.booked_at)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      loading={isFetching && rows.length === 0}
      getRowKey={(b) => b.id}
      empty={<EmptyState icon={CalendarCheck} title="No bookings found" description="Try a different search or filter." />}
      toolbar={
        <>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search bookings…" />
          <FilterChips options={STATUS_FILTERS} value={status} onChange={(v) => { setStatus(v); setPage(0); }} />
        </>
      }
      footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
    />
  );
}
