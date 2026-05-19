/** High-contrast classes for login/signup modals (light + dark). */
export const authModalStyles = {
  panel:
    "w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-xl dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50",
  tabGroup:
    "inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-600 dark:bg-zinc-800",
  tabActive: "bg-orange-500 text-white",
  tabInactive:
    "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
  closeButton:
    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-500 dark:text-zinc-200 dark:hover:bg-zinc-800",
  title: "text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50",
  subtitle: "mt-1 text-sm text-zinc-600 dark:text-zinc-300",
  label: "text-xs font-semibold text-zinc-700 dark:text-zinc-200",
  input:
    "h-10 rounded-xl border-zinc-300 bg-white text-zinc-900 shadow-sm placeholder:text-zinc-500 focus-visible:border-orange-500 focus-visible:ring-orange-500/30 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus-visible:border-orange-400 dark:focus-visible:ring-orange-400/25",
  togglePassword:
    "absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100",
  termsLabel: "flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300",
  checkbox:
    "mt-0.5 size-4 rounded border-zinc-400 bg-white accent-orange-500 dark:border-zinc-500 dark:bg-zinc-800",
  error: "mt-3 text-center text-xs font-medium text-red-600 dark:text-red-400",
  success:
    "mt-3 text-center text-xs font-medium text-emerald-700 dark:text-emerald-400",
} as const;
