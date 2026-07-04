"use client";

import { useState } from "react";
import { Star, Trash2 } from "lucide-react";
import {
  ADMIN_PAGE_SIZE,
  adminActions,
  useAdminMutation,
  useAdminReviews,
} from "@/lib/admin/api";
import type { ReviewRow } from "@/lib/admin/types";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import {
  EmptyState,
  FilterChips,
  Pagination,
  SearchInput,
  useDebouncedValue,
} from "@/components/admin/ui/primitives";
import { ActionMenu } from "@/components/admin/ui/ActionMenu";
import { formatDate } from "@/components/admin/ui/format";
import { cn } from "@/lib/utils";

const RATING_FILTERS = [
  { value: null, label: "All" },
  { value: "5", label: "5★" },
  { value: "4", label: "4★" },
  { value: "3", label: "3★" },
  { value: "2", label: "2★" },
  { value: "1", label: "1★" },
];

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const debounced = useDebouncedValue(search);

  const { data, isFetching } = useAdminReviews({
    search: debounced,
    rating: rating ? Number(rating) : null,
    page,
  });
  const mutation = useAdminMutation();

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const columns: Column<ReviewRow>[] = [
    {
      key: "experience",
      header: "Experience",
      render: (r) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate font-medium">{r.experience_title ?? "—"}</p>
          <p className="truncate text-xs text-muted-foreground">by {r.reviewer_name ?? "Anonymous"}</p>
        </div>
      ),
    },
    { key: "rating", header: "Rating", render: (r) => <Stars rating={r.rating} /> },
    {
      key: "text",
      header: "Review",
      render: (r) => (
        <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">
          {r.review_text || <span className="italic">No comment</span>}
        </p>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (r) => <span className="text-muted-foreground">{formatDate(r.created_at)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <ActionMenu
          items={[
            {
              label: "Delete review",
              icon: Trash2,
              danger: true,
              onClick: () => {
                if (typeof window !== "undefined" && window.confirm("Delete this review? This cannot be undone.")) {
                  mutation.mutate(adminActions.deleteReview(r.id));
                }
              },
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
      getRowKey={(r) => r.id}
      empty={<EmptyState icon={Star} title="No reviews found" description="Try a different search or filter." />}
      toolbar={
        <>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search reviews…" />
          <FilterChips options={RATING_FILTERS} value={rating} onChange={(v) => { setRating(v); setPage(0); }} />
        </>
      }
      footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
    />
  );
}
