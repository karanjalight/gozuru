"use client";

import { useState } from "react";
import { Archive, CheckCircle2, Compass, Eye, EyeOff, Search, XCircle } from "lucide-react";
import {
  ADMIN_PAGE_SIZE,
  adminActions,
  useAdminExperiences,
  useAdminMutation,
} from "@/lib/admin/api";
import type { ExperienceRow } from "@/lib/admin/types";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import {
  EmptyState,
  FilterChips,
  Pagination,
  SearchInput,
  StatusBadge,
  useDebouncedValue,
} from "@/components/admin/ui/primitives";
import { ActionMenu } from "@/components/admin/ui/ActionMenu";
import { formatMoney, formatNumber } from "@/components/admin/ui/format";

const STATUS_FILTERS = [
  { value: null, label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Unpublished" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export default function AdminExperiencesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const debounced = useDebouncedValue(search);

  const { data, isFetching } = useAdminExperiences({ search: debounced, status, page });
  const mutation = useAdminMutation();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const setStatusFor = (id: string, next: string) =>
    mutation.mutate(adminActions.setExperienceStatus(id, next));

  const columns: Column<ExperienceRow>[] = [
    {
      key: "title",
      header: "Experience",
      render: (e) => (
        <div className="min-w-0 max-w-sm">
          <p className="truncate font-medium">{e.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {e.subtitle ?? (e.is_online ? "Online experience" : "In-person experience")}
          </p>
        </div>
      ),
    },
    {
      key: "host",
      header: "Host",
      render: (e) => <span className="truncate text-sm">{e.host_name ?? "—"}</span>,
    },
    {
      key: "category",
      header: "Category",
      render: (e) => <span className="text-muted-foreground">{e.category_name ?? "—"}</span>,
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      render: (e) => <span className="tabular-nums">{e.price_amount ? formatMoney(e.price_amount) : "—"}</span>,
    },
    {
      key: "bookings",
      header: "Bookings",
      align: "center",
      render: (e) => <span className="tabular-nums">{formatNumber(e.bookings_count)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (e) => (
        <ActionMenu
          items={[
            { label: "Publish", icon: Eye, disabled: e.status === "published", onClick: () => setStatusFor(e.id, "published") },
            { label: "Mark in review", icon: Search, disabled: e.status === "in_review", onClick: () => setStatusFor(e.id, "in_review") },
            { label: "Approve", icon: CheckCircle2, disabled: e.status === "approved", onClick: () => setStatusFor(e.id, "approved") },
            { label: "Unpublish", icon: EyeOff, disabled: e.status === "unpublished", onClick: () => setStatusFor(e.id, "unpublished") },
            { label: "Reject", icon: XCircle, danger: true, disabled: e.status === "rejected", onClick: () => setStatusFor(e.id, "rejected") },
            { label: "Archive", icon: Archive, disabled: e.status === "archived", onClick: () => setStatusFor(e.id, "archived") },
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
      getRowKey={(e) => e.id}
      empty={<EmptyState icon={Compass} title="No experiences found" description="Try a different search or filter." />}
      toolbar={
        <>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search experiences…" />
          <FilterChips options={STATUS_FILTERS} value={status} onChange={(v) => { setStatus(v); setPage(0); }} />
        </>
      }
      footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
    />
  );
}
