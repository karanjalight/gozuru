import { parseMoneyAmount } from "@/lib/currency";

export type ReferralRow = {
  id: string;
  referred_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
};

export type CommissionRow = {
  id: string;
  commission_amount: number;
  transaction_amount: number;
  commission_rate: number;
  currency: string;
  status: string;
  created_at: string;
  experience_title: string | null;
};

export type CashoutRow = {
  id: string;
  amount: number;
  currency: string;
  payout_method: string;
  status: string;
  requested_at: string;
  paid_at: string | null;
};

export type AffiliateDashboard = {
  enrolled: boolean;
  referralCode?: string;
  enrolledAt?: string;
  totalEarned: number;
  availableBalance: number;
  pendingCashout: number;
  referrals: ReferralRow[];
  commissions: CommissionRow[];
  cashouts: CashoutRow[];
};

function normalizeCommissionRow(row: unknown): CommissionRow {
  const record = row as Record<string, unknown>;
  return {
    id: String(record.id ?? ""),
    commission_amount: parseMoneyAmount(record.commission_amount),
    transaction_amount: parseMoneyAmount(record.transaction_amount),
    commission_rate: parseMoneyAmount(record.commission_rate),
    currency: String(record.currency ?? "KES"),
    status: String(record.status ?? "accrued"),
    created_at: String(record.created_at ?? ""),
    experience_title:
      typeof record.experience_title === "string" ? record.experience_title : null,
  };
}

function normalizeCashoutRow(row: unknown): CashoutRow {
  const record = row as Record<string, unknown>;
  return {
    id: String(record.id ?? ""),
    amount: parseMoneyAmount(record.amount),
    currency: String(record.currency ?? "KES"),
    payout_method: String(record.payout_method ?? ""),
    status: String(record.status ?? "pending"),
    requested_at: String(record.requested_at ?? ""),
    paid_at: typeof record.paid_at === "string" ? record.paid_at : null,
  };
}

export function normalizeAffiliateDashboard(raw: unknown): AffiliateDashboard {
  const record = (raw ?? {}) as Record<string, unknown>;
  const commissions = Array.isArray(record.commissions)
    ? record.commissions.map(normalizeCommissionRow)
    : [];
  const cashouts = Array.isArray(record.cashouts)
    ? record.cashouts.map(normalizeCashoutRow)
    : [];
  const referrals = Array.isArray(record.referrals)
    ? (record.referrals as ReferralRow[])
    : [];

  const totalEarned = parseMoneyAmount(record.totalEarned ?? record.total_earned);
  const availableBalance = parseMoneyAmount(
    record.availableBalance ?? record.available_balance,
  );
  const pendingCashout = parseMoneyAmount(record.pendingCashout ?? record.pending_cashout);

  return {
    enrolled: Boolean(record.enrolled),
    referralCode:
      typeof record.referralCode === "string"
        ? record.referralCode
        : typeof record.referral_code === "string"
          ? record.referral_code
          : undefined,
    enrolledAt:
      typeof record.enrolledAt === "string"
        ? record.enrolledAt
        : typeof record.enrolled_at === "string"
          ? record.enrolled_at
          : undefined,
    totalEarned,
    availableBalance,
    pendingCashout,
    referrals,
    commissions,
    cashouts,
  };
}

export function getReferralDisplayName(referral: ReferralRow): string {
  return (
    referral.display_name?.trim() ||
    [referral.first_name, referral.last_name].filter(Boolean).join(" ") ||
    referral.email
  );
}

export function getStatusStyles(status: string): string {
  if (status === "paid" || status === "accrued") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (status === "pending" || status === "processing") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
  }
  if (status === "failed" || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300";
}
