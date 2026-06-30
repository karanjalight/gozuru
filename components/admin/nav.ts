import {
  BadgeCheck,
  CalendarCheck,
  Compass,
  CreditCard,
  LayoutDashboard,
  Settings,
  Share2,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Key metrics, trends and activity",
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        href: "/admin/hosts",
        label: "Hosts",
        icon: BadgeCheck,
        description: "Verify and manage experience hosts",
      },
      {
        href: "/admin/experiences",
        label: "Experiences",
        icon: Compass,
        description: "Moderate and publish listings",
      },
      {
        href: "/admin/bookings",
        label: "Bookings",
        icon: CalendarCheck,
        description: "Track reservations and status",
      },
      {
        href: "/admin/payments",
        label: "Payments",
        icon: CreditCard,
        description: "Payments and payouts",
      },
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        description: "Accounts and roles",
      },
      {
        href: "/admin/affiliates",
        label: "Affiliates",
        icon: Share2,
        description: "Referral partners and payouts",
      },
      {
        href: "/admin/reviews",
        label: "Reviews",
        icon: Star,
        description: "Ratings and moderation",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        description: "Admin preferences",
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((g) => g.items);

export function getAdminPageMeta(pathname: string): { title: string; description: string } {
  // Longest matching href wins so /admin/hosts beats /admin.
  const match = [...ADMIN_NAV_ITEMS]
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (match) return { title: match.label, description: match.description };
  return { title: "Dashboard", description: "Key metrics, trends and activity" };
}
