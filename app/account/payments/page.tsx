"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Coins } from "lucide-react";
import {
  buildMockPayments,
  getMockAppliedExperiences,
  type PaymentRow,
} from "@/lib/mock-account";
import { useAuth } from "@/components/auth/AuthProvider";
import type { MockExperience } from "@/lib/mock-experiences";

export default function PaymentsPage() {
  const { user } = useAuth();
  const [experiences, setExperiences] = useState<MockExperience[]>([]);

  useEffect(() => {
    if (!user) return;
    const list = getMockAppliedExperiences(user.email);
    queueMicrotask(() => setExperiences(list));
  }, [user]);

  const payments = useMemo<PaymentRow[]>(() => {
    return buildMockPayments(experiences);
  }, [experiences]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mock data for now (based on applied experiences).
      </p>

      <div className="mt-8">
        <Card className="rounded-2xl border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Transactions</h2>
          </div>

          <div className="mt-4">
            <div className="max-h-64 overflow-auto">
              <table className="w-full border-separate border-spacing-y-1">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-muted-foreground">
                    <th className="pb-2 pr-2">Amount</th>
                    <th className="pb-2 pr-2">Experience</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-4 text-center text-xs text-muted-foreground"
                      >
                        No payments yet
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="text-sm">
                        <td className="pr-2">
                          <span className="block font-semibold">{p.amount}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {p.dateLabel}
                          </span>
                        </td>
                        <td className="pr-2">
                          <span className="block max-w-[220px] truncate font-medium">
                            {p.experienceTitle}
                          </span>
                        </td>
                        <td>
                          <span
                            className={[
                              "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              p.status === "Paid"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-amber-200 bg-amber-50 text-amber-800",
                            ].join(" ")}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

