export const LANDING_CURRENCY = "KES";

export function formatKsh(
  amount: number | null | undefined,
  options?: { maximumFractionDigits?: number },
): string {
  if (amount === null || amount === undefined || amount <= 0) {
    return "Price on request";
  }

  return `Ksh ${amount.toLocaleString("en-KE", {
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  })}`;
}

export function formatFromKsh(amount: number): string {
  return `From ${formatKsh(amount)}`;
}

export function formatDisplayMoney(
  amount: number | null | undefined,
  _currency?: string,
  options?: { maximumFractionDigits?: number },
): string {
  return formatKsh(amount, options);
}

export function parseMoneyAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export function formatBalanceKsh(amount: unknown): string {
  const value = Math.max(parseMoneyAmount(amount), 0);

  return `Ksh ${value.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
