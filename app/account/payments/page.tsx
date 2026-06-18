"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Coins, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useIsClientAccount } from "@/lib/auth/useAccountRole";
import {
  fetchAccountPayments,
  getPaymentStatusClassName,
  type AccountPaymentRow,
} from "@/lib/payments/account-payments";
import { cn } from "@/lib/utils";

export default function PaymentsPage() {
  const { user } = useAuth();
  const { isClient } = useIsClientAccount();
  const [payments, setPayments] = useState<AccountPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const rows = await fetchAccountPayments(user.id);
      setPayments(rows);
    } catch (loadError) {
      setPayments([]);
      setError(loadError instanceof Error ? loadError.message : "Could not load payments.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setPayments([]);
        setLoading(false);
      });
      return;
    }

    void loadPayments();
  }, [loadPayments, user]);

  const stats = useMemo(() => {
    const paid = payments.filter((payment) => payment.status === "succeeded").length;
    const pending = payments.filter((payment) => payment.status === "pending").length;
    return { total: payments.length, paid, pending };
  }, [payments]);

  const subtitle = isClient
    ? "Payments you have made for experience bookings."
    : "Payments received from confirmed bookings on your experiences.";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

      {!loading && payments.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="rounded-2xl border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total transactions
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{stats.total}</p>
          </Card>
          <Card className="rounded-2xl border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Paid
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {stats.paid}
            </p>
          </Card>
          <Card className="rounded-2xl border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pending
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {stats.pending}
            </p>
          </Card>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-8">
        <Card className="rounded-2xl border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Transactions</h2>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading payments...
              </div>
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="w-full border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold text-muted-foreground">
                      <th className="pb-2 pr-2">Amount</th>
                      <th className="pb-2 pr-2">Experience</th>
                      {!isClient ? <th className="pb-2 pr-2">Type</th> : null}
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isClient ? 3 : 4}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          {isClient
                            ? "No payments yet. Book an experience to see your payment history here."
                            : "No payments yet. Payments appear here after guests complete checkout on your experiences."}
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id} className="text-sm">
                          <td className="pr-2">
                            <span className="block font-semibold">{payment.amount}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {payment.dateLabel}
                            </span>
                          </td>
                          <td className="pr-2">
                            <span className="block max-w-[220px] truncate font-medium">
                              {payment.experienceTitle}
                            </span>
                          </td>
                          {!isClient ? (
                            <td className="pr-2">
                              <span className="text-xs font-medium capitalize text-muted-foreground">
                                {payment.direction === "incoming" ? "Received" : "Paid"}
                              </span>
                            </td>
                          ) : null}
                          <td>
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                getPaymentStatusClassName(payment.status),
                              )}
                            >
                              {payment.statusLabel}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
