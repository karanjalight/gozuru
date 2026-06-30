// Shared types for the admin dashboard. These mirror the JSON returned by the
// public.admin_* RPCs in supabase/migrations/20260629_021_admin_dashboard.sql.

export type AdminKpis = {
  revenueTotal: number;
  revenue30: number;
  revenuePrev: number;
  bookingsTotal: number;
  bookings30: number;
  bookingsPrev: number;
  usersTotal: number;
  users30: number;
  usersPrev: number;
  hostsTotal: number;
  hostsPending: number;
  experiencesTotal: number;
  experiencesPublished: number;
  experiencesPending: number;
  avgRating: number;
  reviewsTotal: number;
};

export type RevenuePoint = {
  day: string;
  revenue: number;
  bookings: number;
};

export type StatusCount = {
  status: string;
  count: number;
};

export type RecentBooking = {
  id: string;
  status: string;
  total_amount: number;
  currency: string;
  booked_at: string;
  experience_title: string | null;
  guest_name: string | null;
};

export type RecentSignup = {
  user_id: string;
  name: string | null;
  email: string | null;
  city: string | null;
  created_at: string;
};

export type TopExperience = {
  id: string;
  title: string;
  status: string;
  bookings: number;
  revenue: number;
};

export type PendingHost = {
  user_id: string;
  name: string | null;
  headline: string | null;
  created_at: string;
};

export type PendingExperience = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  host_name: string | null;
};

export type AdminOverview = {
  kpis: AdminKpis;
  revenueSeries: RevenuePoint[];
  bookingsByStatus: StatusCount[];
  experiencesByStatus: StatusCount[];
  recentBookings: RecentBooking[];
  recentSignups: RecentSignup[];
  topExperiences: TopExperience[];
  pendingHosts: PendingHost[];
  pendingExperiences: PendingExperience[];
};

export type HostRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  city: string | null;
  avatar_path: string | null;
  headline: string | null;
  expertise: string | null;
  years_experience: number | null;
  verification_status: string;
  payout_account_ready: boolean;
  created_at: string;
  experiences_count: number;
};

export type ExperienceRow = {
  id: string;
  title: string;
  subtitle: string | null;
  status: string;
  price_amount: number | null;
  currency: string;
  is_online: boolean;
  created_at: string;
  host_name: string | null;
  host_user_id: string;
  category_name: string | null;
  bookings_count: number;
};

export type BookingRow = {
  id: string;
  status: string;
  guests_count: number;
  total_amount: number;
  currency: string;
  booked_at: string;
  experience_title: string | null;
  guest_name: string | null;
  host_name: string | null;
};

export type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  paid_at: string | null;
  created_at: string;
  payer_name: string | null;
  payee_name: string | null;
  experience_title: string | null;
};

export type PaymentTotals = {
  succeeded: number;
  pending: number;
  refunded: number;
};

export type UserRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  city: string | null;
  country_code: string | null;
  avatar_path: string | null;
  created_at: string;
  is_host: boolean;
  is_admin: boolean;
  is_affiliate: boolean;
  bookings_count: number;
};

export type AffiliateRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  referral_code: string;
  enrolled_at: string;
  referrals_count: number;
  total_earned: number;
  pending_cashout: number;
};

export type ReviewRow = {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  experience_title: string | null;
  reviewer_name: string | null;
};

export type ListResult<Row> = {
  rows: Row[];
  total: number;
};

export type PaymentsListResult = ListResult<PaymentRow> & {
  totals: PaymentTotals;
};
