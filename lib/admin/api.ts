"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type {
  AdminOverview,
  AffiliateRow,
  BookingRow,
  ExperienceRow,
  HostRow,
  ListResult,
  PaymentsListResult,
  ReviewRow,
  UserRow,
} from "./types";

export const ADMIN_PAGE_SIZE = 12;

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

const EMPTY_LIST = { rows: [], total: 0 };

export function useAdminOverview(): UseQueryResult<AdminOverview> {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => rpc<AdminOverview>("admin_overview"),
    staleTime: 1000 * 60,
  });
}

export type ListParams = {
  search?: string;
  status?: string | null;
  rating?: number | null;
  page?: number;
};

function listArgs(params: ListParams) {
  const page = params.page ?? 0;
  return {
    p_search: params.search?.trim() || null,
    p_status: params.status ?? null,
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: page * ADMIN_PAGE_SIZE,
  };
}

export function useAdminHosts(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "hosts", params],
    queryFn: () => rpc<ListResult<HostRow>>("admin_list_hosts", listArgs(params)),
    placeholderData: (prev) => prev ?? (EMPTY_LIST as ListResult<HostRow>),
  });
}

export function useAdminExperiences(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "experiences", params],
    queryFn: () =>
      rpc<ListResult<ExperienceRow>>("admin_list_experiences", listArgs(params)),
    placeholderData: (prev) => prev ?? (EMPTY_LIST as ListResult<ExperienceRow>),
  });
}

export function useAdminBookings(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "bookings", params],
    queryFn: () =>
      rpc<ListResult<BookingRow>>("admin_list_bookings", listArgs(params)),
    placeholderData: (prev) => prev ?? (EMPTY_LIST as ListResult<BookingRow>),
  });
}

export function useAdminPayments(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "payments", params],
    queryFn: () =>
      rpc<PaymentsListResult>("admin_list_payments", listArgs(params)),
    placeholderData: (prev) =>
      prev ??
      ({ rows: [], total: 0, totals: { succeeded: 0, pending: 0, refunded: 0 } } as PaymentsListResult),
  });
}

export function useAdminUsers(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () =>
      rpc<ListResult<UserRow>>("admin_list_users", {
        p_search: params.search?.trim() || null,
        p_limit: ADMIN_PAGE_SIZE,
        p_offset: (params.page ?? 0) * ADMIN_PAGE_SIZE,
      }),
    placeholderData: (prev) => prev ?? (EMPTY_LIST as ListResult<UserRow>),
  });
}

export function useAdminAffiliates(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "affiliates", params],
    queryFn: () =>
      rpc<ListResult<AffiliateRow>>("admin_list_affiliates", {
        p_search: params.search?.trim() || null,
        p_limit: ADMIN_PAGE_SIZE,
        p_offset: (params.page ?? 0) * ADMIN_PAGE_SIZE,
      }),
    placeholderData: (prev) => prev ?? (EMPTY_LIST as ListResult<AffiliateRow>),
  });
}

export function useAdminReviews(params: ListParams) {
  return useQuery({
    queryKey: ["admin", "reviews", params],
    queryFn: () =>
      rpc<ListResult<ReviewRow>>("admin_list_reviews", {
        p_search: params.search?.trim() || null,
        p_rating: params.rating ?? null,
        p_limit: ADMIN_PAGE_SIZE,
        p_offset: (params.page ?? 0) * ADMIN_PAGE_SIZE,
      }),
    placeholderData: (prev) => prev ?? (EMPTY_LIST as ListResult<ReviewRow>),
  });
}

// --- Moderation mutations -----------------------------------------------------

export function useAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { fn: string; args: Record<string, unknown> }) =>
      rpc(input.fn, input.args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export const adminActions = {
  setHostVerification: (userId: string, status: string, notes?: string) => ({
    fn: "admin_set_host_verification",
    args: { p_user_id: userId, p_status: status, p_notes: notes ?? null },
  }),
  setExperienceStatus: (experienceId: string, status: string) => ({
    fn: "admin_set_experience_status",
    args: { p_experience_id: experienceId, p_status: status },
  }),
  setAdminRole: (userId: string, grant: boolean) => ({
    fn: "admin_set_admin_role",
    args: { p_user_id: userId, p_grant: grant },
  }),
  deleteReview: (reviewId: string) => ({
    fn: "admin_delete_review",
    args: { p_review_id: reviewId },
  }),
  updateCashoutStatus: (cashoutId: string, status: string) => ({
    fn: "admin_update_cashout_status",
    args: { p_cashout_id: cashoutId, p_status: status },
  }),
};
