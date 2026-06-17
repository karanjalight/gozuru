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
