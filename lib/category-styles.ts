export function categoryBadgeClass(category: string): string {
  const normalized = category.toLowerCase();
  if (normalized.includes("hotel")) return "bg-blue-600/90";
  if (normalized.includes("meetup")) return "bg-orange-600/90";
  if (normalized.includes("social")) return "bg-purple-600/90";
  if (normalized.includes("expo")) return "bg-emerald-600/90";
  if (normalized.includes("expert") || normalized.includes("culture")) return "bg-rose-600/90";
  return "bg-orange-600/90";
}
