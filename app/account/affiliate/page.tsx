"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Banknote,
  Check,
  Copy,
  Link2,
  Loader2,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { enrollAsAffiliate } from "@/lib/affiliate/enroll";
import {
  getReferralDisplayName,
  getStatusStyles,
  normalizeAffiliateDashboard,
  type AffiliateDashboard,
  type CashoutRow,
  type CommissionRow,
  type ReferralRow,
} from "@/lib/affiliate/dashboard";
import { buildReferralLink } from "@/lib/affiliate/referral";
import { formatBalanceKsh } from "@/lib/currency";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type TabId = "overview" | "referrals" | "earnings" | "payouts";

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "referrals", label: "Referrals", icon: Users },
  { id: "earnings", label: "Earnings", icon: TrendingUp },
  { id: "payouts", label: "Payouts", icon: Wallet },
];

const inputClassName =
  "h-11 rounded-xl border-border bg-background focus-visible:border-orange-400 focus-visible:ring-orange-100 dark:focus-visible:ring-orange-500/20";

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        getStatusStyles(status),
      )}
    >
      {status}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm sm:p-5",
        highlight
          ? "border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10"
          : "border-border/80",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            highlight
              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
              : "bg-orange-500/10 text-orange-600 dark:text-orange-400",
          )}
        >
          <Icon className="size-4" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-[1.75rem]",
          highlight && "text-amber-700 dark:text-amber-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AffiliateHero({
  referralCode,
  totalEarned,
  availableBalance,
  referralCount,
  pendingCashout,
  onCopyCode,
  codeCopied,
}: {
  referralCode: string | null;
  totalEarned: number;
  availableBalance: number;
  referralCount: number;
  pendingCashout: number;
  onCopyCode: () => void;
  codeCopied: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-orange-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 size-56 rounded-full bg-emerald-500/10 blur-3xl"
      />

      <div className="relative px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
              <Sparkles className="size-3.5" />
              Affiliate partner
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Affiliate dashboard
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Share your referral link, track your network, and earn{" "}
              <span className="font-semibold text-orange-600 dark:text-orange-400">5% commission</span>{" "}
              on every qualifying booking.
            </p>

            {referralCode ? (
              <div className="mt-6 flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-orange-200/80 bg-orange-50/60 p-4 dark:border-orange-500/20 dark:bg-orange-500/5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Your referral code
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold tracking-[0.2em] text-foreground">
                    {referralCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCopyCode}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
                >
                  {codeCopied ? (
                    <>
                      <Check className="size-4 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Copy code
                    </>
                  )}
                </button>
              </div>
            ) : null}
          </div>

          <div className="w-full lg:w-[280px] lg:shrink-0">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-transparent">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Wallet className="size-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Available balance
                </p>
              </div>
              <p className="mt-4 text-4xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-400">
                {formatBalanceKsh(availableBalance)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {availableBalance > 0
                  ? "Ready to withdraw from the Payouts tab."
                  : "Earnings appear here after qualifying bookings."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 border-t border-border/60 pt-8 sm:grid-cols-3">
          <HeroMetric icon={TrendingUp} label="Total earned" value={formatBalanceKsh(totalEarned)} />
          <HeroMetric icon={Users} label="Referrals" value={String(referralCount)} />
          <HeroMetric
            icon={Banknote}
            label="Pending payout"
            value={formatBalanceKsh(pendingCashout)}
            highlight={pendingCashout > 0}
          />
        </div>
      </div>
    </div>
  );
}

export default function AffiliatePage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<AffiliateDashboard | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("mpesa");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [cashoutSubmitting, setCashoutSubmitting] = useState(false);
  const [cashoutMessage, setCashoutMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("get_affiliate_dashboard");

    if (rpcError) {
      setError(rpcError.message);
      setDashboard(null);
    } else {
      setDashboard(normalizeAffiliateDashboard(data));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setDashboard(null);
        setLoading(false);
      });
      return;
    }
    void loadDashboard();
  }, [loadDashboard, user]);

  useEffect(() => {
    if (user?.metadata.phone && !payoutPhone) {
      setPayoutPhone(user.metadata.phone);
    }
  }, [payoutPhone, user?.metadata.phone]);

  const referralLink = useMemo(() => {
    if (!dashboard?.referralCode) return "";
    return buildReferralLink(dashboard.referralCode);
  }, [dashboard?.referralCode]);

  const onEnroll = async () => {
    setEnrolling(true);
    setError(null);
    try {
      await enrollAsAffiliate();
      await loadDashboard();
    } catch (enrollError) {
      setError(enrollError instanceof Error ? enrollError.message : "Enrollment failed.");
    } finally {
      setEnrolling(false);
    }
  };

  const onCopyCode = async () => {
    if (!dashboard?.referralCode) return;
    try {
      await navigator.clipboard.writeText(dashboard.referralCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setError("Could not copy code. Please copy it manually.");
    }
  };

  const onCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link. Please copy it manually.");
    }
  };

  const onShareLink = async () => {
    if (!referralLink || !navigator.share) {
      await onCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: "Join Gozuru",
        text: "Sign up on Gozuru with my referral link.",
        url: referralLink,
      });
    } catch {
      // user cancelled share
    }
  };

  const onRequestCashout = async () => {
    setCashoutMessage(null);
    setError(null);

    const amount = Number.parseFloat(cashoutAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid cash-out amount.");
      return;
    }

    if (payoutMethod === "mpesa" && !payoutPhone.trim()) {
      setError("Enter your M-Pesa phone number.");
      return;
    }

    setCashoutSubmitting(true);

    const { error: cashoutError } = await supabase.rpc("request_affiliate_cashout", {
      p_amount: amount,
      p_payout_method: payoutMethod,
      p_payout_details: { phone: payoutPhone.trim() || null },
    });

    if (cashoutError) {
      setError(cashoutError.message);
      setCashoutSubmitting(false);
      return;
    }

    setCashoutAmount("");
    setCashoutMessage("Cash-out request submitted. We will process it within 3–5 business days.");
    setActiveTab("payouts");
    await loadDashboard();
    setCashoutSubmitting(false);
  };

  const onCashoutAll = () => {
    if (!dashboard || dashboard.availableBalance <= 0) return;
    setCashoutAmount(String(dashboard.availableBalance));
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-24">
        <Loader2 className="size-7 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!dashboard?.enrolled) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-8 shadow-sm sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-56 rounded-full bg-orange-500/10 blur-3xl"
          />
          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">
              <Share2 className="size-3.5" />
              Affiliate program
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Earn 5% when you share Gozuru
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Get your unique referral link, invite people to sign up, and earn commission on
              every paid booking they complete.
            </p>
            <ul className="mt-8 space-y-4 text-sm text-foreground/90">
              {[
                "Share your link on social, WhatsApp, or email",
                "Track everyone who joins through you",
                "Cash out your earnings via M-Pesa or bank transfer",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Check className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className="mt-8 h-12 rounded-full bg-orange-500 px-8 text-white hover:bg-orange-600"
              onClick={onEnroll}
              disabled={enrolling}
            >
              {enrolling ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Activating...
                </>
              ) : (
                "Activate affiliate account"
              )}
            </Button>
            {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  const referrals = dashboard.referrals;
  const commissions = dashboard.commissions;
  const cashouts = dashboard.cashouts;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6 lg:pt-6">
      <AffiliateHero
        referralCode={dashboard.referralCode ?? null}
        totalEarned={dashboard.totalEarned}
        availableBalance={dashboard.availableBalance}
        referralCount={referrals.length}
        pendingCashout={dashboard.pendingCashout}
        onCopyCode={onCopyCode}
        codeCopied={codeCopied}
      />

      {/* Tabs */}
      <div className="mt-8 overflow-x-auto">
        <div
          className="inline-flex min-w-full gap-1 rounded-2xl border border-border/80 bg-muted/30 p-1 sm:min-w-0"
          role="tablist"
          aria-label="Affiliate sections"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const count =
              tab.id === "referrals"
                ? referrals.length
                : tab.id === "earnings"
                  ? commissions.length
                  : tab.id === "payouts"
                    ? cashouts.length
                    : null;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {tab.label}
                {count !== null && count > 0 ? (
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {(error || cashoutMessage) && (
        <div
          className={cn(
            "mt-6 rounded-2xl border px-4 py-3 text-sm",
            error
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
          )}
        >
          {error ?? cashoutMessage}
        </div>
      )}

      {/* Tab panels */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <OverviewTab
            referralLink={referralLink}
            copied={copied}
            onCopyLink={onCopyLink}
            onShareLink={onShareLink}
            onGoPayouts={() => setActiveTab("payouts")}
            availableBalance={dashboard.availableBalance}
          />
        )}

        {activeTab === "referrals" && <ReferralsTab referrals={referrals} />}

        {activeTab === "earnings" && <EarningsTab commissions={commissions} />}

        {activeTab === "payouts" && (
          <PayoutsTab
            dashboard={dashboard}
            cashouts={cashouts}
            cashoutAmount={cashoutAmount}
            setCashoutAmount={setCashoutAmount}
            payoutMethod={payoutMethod}
            setPayoutMethod={setPayoutMethod}
            payoutPhone={payoutPhone}
            setPayoutPhone={setPayoutPhone}
            cashoutSubmitting={cashoutSubmitting}
            onRequestCashout={onRequestCashout}
            onCashoutAll={onCashoutAll}
          />
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  referralLink,
  copied,
  onCopyLink,
  onShareLink,
  onGoPayouts,
  availableBalance,
}: {
  referralLink: string;
  copied: boolean;
  onCopyLink: () => void;
  onShareLink: () => void;
  onGoPayouts: () => void;
  availableBalance: number;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
              <Link2 className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Your referral link</h2>
              <p className="text-sm text-muted-foreground">
                Send this link so sign-ups are attributed to you.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-6">
          <Input readOnly value={referralLink} className={cn(inputClassName, "font-mono text-xs")} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
              onClick={onCopyLink}
            >
              {copied ? (
                <>
                  <Check className="mr-2 size-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 size-4" />
                  Copy link
                </>
              )}
            </Button>
            <Button type="button" variant="outline" className="rounded-full" onClick={onShareLink}>
              <Share2 className="mr-2 size-4" />
              Share
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-2xl border-border/80 p-6 shadow-sm">
          <h3 className="text-sm font-semibold">How it works</h3>
          <ol className="mt-4 space-y-4 text-sm text-muted-foreground">
            {[
              "Share your unique referral link",
              "Friends sign up through your link",
              "You earn 5% on their paid bookings",
              "Cash out when your balance is ready",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-600">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Ready to withdraw
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {formatBalanceKsh(availableBalance)}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full rounded-full border-emerald-500/30"
            onClick={onGoPayouts}
            disabled={availableBalance <= 0}
          >
            Request payout
            <ArrowUpRight className="ml-1 size-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
}

function ReferralsTab({ referrals }: { referrals: ReferralRow[] }) {
  if (referrals.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No referrals yet"
        description="Share your referral link to start building your network on Gozuru."
      />
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4">Member</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Joined</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((referral) => (
              <tr key={referral.id} className="border-b border-border/40 last:border-0">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-orange-500/10 text-sm font-semibold text-orange-600">
                      {getReferralDisplayName(referral).charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{getReferralDisplayName(referral)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{referral.email}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(referral.referred_at).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function EarningsTab({ commissions }: { commissions: CommissionRow[] }) {
  if (commissions.length === 0) {
    return (
      <EmptyState
        icon={Banknote}
        title="No earnings yet"
        description="Commissions appear here when your referrals complete paid bookings on Gozuru."
      />
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4">Commission</th>
              <th className="px-6 py-4">Booking</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.map((commission) => (
              <tr key={commission.id} className="border-b border-border/40 last:border-0">
                <td className="px-6 py-4">
                  <p className="font-semibold">{formatBalanceKsh(commission.commission_amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    5% of {formatBalanceKsh(commission.transaction_amount)}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="max-w-[200px] truncate font-medium">
                    {commission.experience_title ?? "Experience booking"}
                  </p>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(commission.created_at).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={commission.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PayoutsTab({
  dashboard,
  cashouts,
  cashoutAmount,
  setCashoutAmount,
  payoutMethod,
  setPayoutMethod,
  payoutPhone,
  setPayoutPhone,
  cashoutSubmitting,
  onRequestCashout,
  onCashoutAll,
}: {
  dashboard: AffiliateDashboard;
  cashouts: CashoutRow[];
  cashoutAmount: string;
  setCashoutAmount: (value: string) => void;
  payoutMethod: string;
  setPayoutMethod: (value: string) => void;
  payoutPhone: string;
  setPayoutPhone: (value: string) => void;
  cashoutSubmitting: boolean;
  onRequestCashout: () => void;
  onCashoutAll: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-6 py-5">
          <h2 className="text-base font-semibold">Payout history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your withdrawal requests and their status.
          </p>
        </div>
        {cashouts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Wallet}
              title="No payouts yet"
              description="When you request a cash-out, it will appear here with its processing status."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-border/60 bg-muted/10 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Requested</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {cashouts.map((cashout) => (
                  <tr key={cashout.id} className="border-b border-border/40 last:border-0">
                    <td className="px-6 py-4 font-semibold">{formatBalanceKsh(cashout.amount)}</td>
                    <td className="px-6 py-4 capitalize text-sm">{cashout.payout_method}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(cashout.requested_at).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={cashout.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="h-fit overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <div className="border-b border-border/60 bg-muted/20 px-6 py-5">
          <h2 className="text-base font-semibold">Request payout</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Available:{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatBalanceKsh(dashboard.availableBalance)}
            </span>
          </p>
          {dashboard.pendingCashout > 0 ? (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {formatBalanceKsh(dashboard.pendingCashout)} already pending
            </p>
          ) : null}
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Amount (KES)</label>
              <button
                type="button"
                onClick={onCashoutAll}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                disabled={dashboard.availableBalance <= 0}
              >
                Withdraw all
              </button>
            </div>
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder="e.g. 500"
              value={cashoutAmount}
              onChange={(event) => setCashoutAmount(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Payout method</label>
            <select
              value={payoutMethod}
              onChange={(event) => setPayoutMethod(event.target.value)}
              className={cn(inputClassName, "w-full px-3")}
            >
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank transfer</option>
            </select>
          </div>

          {payoutMethod === "mpesa" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">M-Pesa phone number</label>
              <Input
                type="tel"
                placeholder="e.g. 0712345678"
                value={payoutPhone}
                onChange={(event) => setPayoutPhone(event.target.value)}
                className={inputClassName}
              />
            </div>
          ) : null}

          <Button
            type="button"
            className="h-12 w-full rounded-full bg-orange-500 text-white hover:bg-orange-600"
            onClick={onRequestCashout}
            disabled={cashoutSubmitting || dashboard.availableBalance <= 0}
          >
            {cashoutSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request cash out"
            )}
          </Button>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Payouts are reviewed manually and typically processed within 3–5 business days.
          </p>
        </div>
      </Card>
    </div>
  );
}
