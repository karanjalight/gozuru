"use client";

import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/admin/ui/primitives";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
};

export function DataTable<T>({
  columns,
  rows,
  loading,
  getRowKey,
  empty,
  toolbar,
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  getRowKey: (row: T) => string;
  empty: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const alignClass = (align?: Column<T>["align"]) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card ring-1 ring-foreground/[0.03]">
      {toolbar && (
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {toolbar}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} cols={columns.length} />
      ) : rows.length === 0 ? (
        empty
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      alignClass(col.align),
                      col.headerClassName,
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row) => (
                <tr key={getRowKey(row)} className="transition-colors hover:bg-muted/40">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-5 py-3.5 align-middle", alignClass(col.align), col.className)}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footer}
    </div>
  );
}
