# Admin Delete Experiences & Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins the ability to permanently delete an experience or a user from the admin dashboard, with an accurate preview of what will be destroyed before it happens.

**Architecture:** Experience deletion follows this codebase's existing all-RPC pattern exactly (client → `supabase.rpc()` → `security definer` function gated by `assert_admin()`) — all cascades already work today. User deletion needs a different mechanism: `auth.users` can only be removed through Supabase's Admin API, which requires the service-role key and must run server-side, so it gets a new Next.js API route. That route first calls an RPC (running as the calling admin, not the service role) that enforces guardrails and clears the guest-side bookings/payments a database constraint otherwise protects — then calls `auth.admin.deleteUser()` with the service-role client, which cascades everything else via existing foreign keys.

**Tech Stack:** Next.js 16 (App Router, API routes), React 19, TypeScript, TanStack Query, Supabase (Postgres + Auth Admin API), Tailwind v4.

## Global Constraints

- No test framework exists in this repo. Verification throughout this plan is manual/build-only: `npx tsc --noEmit` after every task, `npm run build` at the end, plus a manual check (dev server + either a headless-Chromium screenshot check as done earlier this session, or direct `curl`/RPC calls where a screenshot isn't the right tool).
- All new SQL functions follow the exact pattern already established in `supabase/migrations/20260629_021_admin_dashboard.sql`: `language plpgsql`, `security definer`, `set search_path = public`, `perform public.assert_admin();` as the first statement of every function body, read-only functions marked `stable`, mutating functions not marked `stable`, errors raised via `raise exception '...' using errcode = '...';`, success returns `jsonb_build_object('ok', true, ...)`, and a `grant execute on function ... to anon, authenticated;` line for every new function (the `assert_admin()` check inside is the real authorization boundary — RLS is off on `experiences`/`profiles`/`host_profiles`/`bookings`/`payments`/`user_roles`, confirmed by reading `supabase/migrations/20260423_003_drop_all_rls.sql` and every later migration).
- The existing `bookings.guest_user_id` and `payments.payer_user_id` foreign keys stay `ON DELETE RESTRICT` — do NOT change these constraints in a migration. Per an explicit product decision, only the new `admin_prepare_user_deletion` RPC is allowed to bypass that protection (by explicitly deleting those rows itself before the user delete proceeds), so that no other, unrelated code path can ever silently wipe financial records.
- Never write the Supabase service-role key into any file that ships to the browser. It must only be read via `process.env.SUPABASE_SERVICE_ROLE_KEY` inside a Next.js Route Handler (`app/api/**/route.ts`), never inside a `"use client"` file or anything imported by one. Do not use `process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY` in any new code in this plan, even though it happens to hold the same value today — that variable name is itself a latent security risk flagged separately, not something to build on further.
- Match existing UI conventions exactly: the `ActionMenu` `danger: true` item styling, the `createPortal`-based modal pattern already used by `components/experience/ExperienceTicketModal.tsx` (no new modal/dialog library), and the `Trash2` icon from `lucide-react` already used for the reviews page's delete action.

---

### Task 1: Database — delete RPCs and impact-preview RPCs

**Files:**
- Create: `supabase/migrations/20260810_023_admin_delete_actions.sql`
- Test: manual (no test framework — see Global Constraints)

**Interfaces:**
- Produces: 4 RPCs callable via `supabase.rpc(name, args)` from the client (experience ones) or from a server-side authenticated client (user ones) — exact names and argument shapes below. Task 3 (client wiring) and Task 5 (API route) consume these exact names/args.

This migration needs to be applied to the live database before the feature works end-to-end. It will NOT be applied automatically as part of this plan (matches the existing convention — the currency migration from an earlier phase was also left for manual application). Step 5 below tells you how to verify it against the actual schema before finalizing.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260810_023_admin_delete_actions.sql`:

```sql
-- =============================================================================
-- Admin delete actions: experiences and users
-- -----------------------------------------------------------------------------
-- Adds hard-delete capability for experiences and users to the admin
-- dashboard, plus read-only impact-preview RPCs so the UI can show exactly
-- what will be destroyed before the admin confirms. Follows the same
-- SECURITY DEFINER + assert_admin() pattern as every other RPC in
-- 20260629_021_admin_dashboard.sql.
--
-- Experience deletion is a plain delete — every foreign key referencing
-- experiences.id already cascades (bookings, payments via bookings, reviews,
-- media, availability, favorites, checkout_sessions).
--
-- User deletion is split in two: this migration only prepares a user for
-- deletion (guardrails + clearing the guest-side bookings/payments that a
-- database constraint otherwise protects). The actual auth.users removal
-- happens from app/api/admin/delete-user/route.ts via the Supabase Admin
-- API, which is the only way to remove an auth.users row — a plain SQL
-- DELETE from this schema cannot do it.
-- =============================================================================

-- --- Experience deletion ------------------------------------------------------

create or replace function public.admin_get_experience_delete_impact(p_experience_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  perform public.assert_admin();

  select title into v_title from public.experiences where id = p_experience_id;
  if v_title is null then
    raise exception 'Experience not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'title', v_title,
    'bookingsCount', (
      select count(*) from public.bookings where experience_id = p_experience_id
    ),
    'paymentsCount', (
      select count(*)
      from public.payments p
      join public.bookings b on b.id = p.booking_id
      where b.experience_id = p_experience_id
    ),
    'reviewsCount', (
      select count(*) from public.reviews where experience_id = p_experience_id
    ),
    'mediaCount', (
      select count(*) from public.experience_media where experience_id = p_experience_id
    ),
    'availabilityCount', (
      select count(*) from public.experience_availability where experience_id = p_experience_id
    )
  );
end;
$$;

create or replace function public.admin_delete_experience(p_experience_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  delete from public.experiences where id = p_experience_id;
  if not found then
    raise exception 'Experience not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object('ok', true, 'id', p_experience_id);
end;
$$;

-- --- User deletion -------------------------------------------------------------

create or replace function public.admin_get_user_delete_impact(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  perform public.assert_admin();

  select exists(select 1 from public.profiles where user_id = p_user_id) into v_exists;
  if not v_exists then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'isHost', (select exists(select 1 from public.host_profiles where user_id = p_user_id)),
    'isAdmin', (select exists(select 1 from public.user_roles where user_id = p_user_id and role = 'admin')),
    'experiencesCount', (select count(*) from public.experiences where host_user_id = p_user_id),
    'bookingsAsGuestCount', (select count(*) from public.bookings where guest_user_id = p_user_id),
    'bookingsAsHostCount', (select count(*) from public.bookings where host_user_id = p_user_id),
    'paymentsAsPayerCount', (select count(*) from public.payments where payer_user_id = p_user_id),
    'reviewsCount', (select count(*) from public.reviews where reviewer_user_id = p_user_id)
  );
end;
$$;

create or replace function public.admin_prepare_user_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  perform public.assert_admin();

  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account.' using errcode = '23514';
  end if;

  select exists(select 1 from public.profiles where user_id = p_user_id) into v_exists;
  if not v_exists then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;

  -- Guard against removing the last remaining admin (same pattern as
  -- admin_set_admin_role in 20260629_021_admin_dashboard.sql).
  if (select count(*) from public.user_roles where role = 'admin') <= 1
     and exists (select 1 from public.user_roles where role = 'admin' and user_id = p_user_id) then
    raise exception 'Cannot delete the last remaining admin.' using errcode = '23514';
  end if;

  -- bookings.guest_user_id and payments.payer_user_id are ON DELETE RESTRICT
  -- by design, to protect financial records from any non-admin-gated
  -- deletion path. This RPC is the deliberate, admin-only exception: it
  -- explicitly clears them so the caller (app/api/admin/delete-user) can
  -- then remove the auth.users row via the Supabase Admin API without
  -- hitting a foreign-key violation. Every payments row is uniquely tied to
  -- one bookings row via a NOT NULL UNIQUE booking_id, so deleting the
  -- user's bookings-as-guest already cascades their payments-as-payer in
  -- the normal case; the explicit payments delete below is a defensive
  -- second pass for the edge case of someone paying for a booking made
  -- under a different guest_user_id.
  delete from public.bookings where guest_user_id = p_user_id;
  delete from public.payments where payer_user_id = p_user_id;

  return jsonb_build_object('ok', true, 'id', p_user_id);
end;
$$;

-- --- Grants ---------------------------------------------------------------------

grant execute on function public.admin_get_experience_delete_impact(uuid) to anon, authenticated;
grant execute on function public.admin_delete_experience(uuid) to anon, authenticated;
grant execute on function public.admin_get_user_delete_impact(uuid) to anon, authenticated;
grant execute on function public.admin_prepare_user_deletion(uuid) to anon, authenticated;
```

- [ ] **Step 2: Verify the referenced columns against the actual schema history**

Before treating this as done, cross-check every table/column this migration touches against the full migration history (not just the initial schema, in case a later migration changed something):

```bash
grep -n "create table if not exists public.\(bookings\|payments\|reviews\|experience_media\|experience_availability\|experiences\|profiles\|host_profiles\|user_roles\)" supabase/migrations/20260410_001_initial_gozuru_schema.sql
grep -rn "alter table public.\(bookings\|payments\|reviews\|experience_media\|experience_availability\|experiences\|profiles\|host_profiles\|user_roles\)" supabase/migrations/*.sql
```

Confirm: `bookings.experience_id`, `bookings.guest_user_id`, `bookings.host_user_id`; `payments.booking_id`, `payments.payer_user_id`; `reviews.experience_id`, `reviews.reviewer_user_id`; `experience_media.experience_id`; `experience_availability.experience_id`; `experiences.host_user_id`; `host_profiles.user_id`; `user_roles.user_id`, `user_roles.role` all exist exactly as referenced above and haven't been renamed or dropped by a later migration. If anything differs, fix the migration file to match the actual current schema, not this plan's description of it.

- [ ] **Step 3: Confirm `assert_admin()` and the `role = 'admin'` enum comparison pattern**

```bash
grep -n "assert_admin\|app_role" supabase/migrations/20260629_021_admin_dashboard.sql supabase/migrations/20260410_001_initial_gozuru_schema.sql | head -20
```

Confirm `public.assert_admin()` exists exactly as referenced, and confirm `role = 'admin'` (a bare string literal compared against the `user_roles.role` enum column) is valid syntax already proven to work elsewhere (it's used this same way in `admin_set_admin_role`) — no explicit cast needed.

- [ ] **Step 4: Report the migration as ready for manual application**

This migration is NOT applied automatically. In your final report for this task, state clearly: "This migration has not been applied to any database — it needs to be run via `supabase db push` or pasted into the Supabase SQL Editor before the feature will work end-to-end," matching how the currency-defaults migration from an earlier phase was handled. Do not attempt to apply it yourself (no credentials for that are available, and it's a deliberate manual step).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260810_023_admin_delete_actions.sql
git commit -m "feat: add admin_delete_experience and admin user-deletion RPCs"
```

---

### Task 2: `ConfirmDeleteDialog` component

**Files:**
- Create: `components/admin/ui/ConfirmDeleteDialog.tsx`
- Test: manual

**Interfaces:**
- Produces: `ConfirmDeleteDialog` component with the props defined below. Tasks 4 and 6 (wiring the experiences and users pages) both consume this exact prop shape.

A reusable confirmation modal for both delete flows. Matches the existing `createPortal`-based fixed-overlay pattern from `components/experience/ExperienceTicketModal.tsx` — no new modal library, no `@base-ui/react` Dialog primitive (this codebase already has a working portal pattern, use it).

- [ ] **Step 1: Write the component**

Create `components/admin/ui/ConfirmDeleteDialog.tsx`:

```tsx
"use client";

import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, X } from "lucide-react";

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** e.g. "12 bookings", "4 payment records" — rendered as a bullet list. Empty array renders no list. */
  impactLines: string[];
  loadingImpact?: boolean;
  submitting?: boolean;
  error?: string | null;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  impactLines,
  loadingImpact = false,
  submitting = false,
  error = null,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (!submitting) onOpenChange(false);
        }}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 pt-1">
            <h2 className="text-base font-semibold text-foreground">Delete {title}?</h2>
            <p className="mt-1 text-sm text-muted-foreground">This action is permanent and cannot be undone.</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
          {loadingImpact ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking what will be deleted…
            </p>
          ) : impactLines.length > 0 ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                This will also permanently delete
              </p>
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                {impactLines.map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <span className="size-1 shrink-0 rounded-full bg-destructive" />
                    {line}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No dependent records found.</p>
          )}
        </div>

        {error ? (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting || loadingImpact}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white transition hover:bg-destructive/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Permanently delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/ui/ConfirmDeleteDialog.tsx
git commit -m "feat: add reusable ConfirmDeleteDialog component for admin destructive actions"
```

---

### Task 3: Client API wiring — experience and user delete/impact hooks

**Files:**
- Modify: `lib/admin/api.ts`
- Test: manual

**Interfaces:**
- Consumes: RPC names/args from Task 1 (`admin_get_experience_delete_impact`, `admin_delete_experience`, `admin_get_user_delete_impact`, `admin_prepare_user_deletion`), the `supabase` client export from `lib/supabase/client.ts` (already imported in this file today as `import { supabase } from "@/lib/supabase/client";`).
- Produces: `useExperienceDeleteImpact(experienceId: string | null)`, `useUserDeleteImpact(userId: string | null)`, `useDeleteUserMutation()`, and `adminActions.deleteExperience(experienceId: string)` — Tasks 4 and 6 import these exact names.

The `/api/admin/delete-user` route this task's `useDeleteUserMutation` calls doesn't exist yet (that's Task 5) — this is fine, the hook only needs to compile; it will 404 until Task 5 lands. Don't skip writing it now just because the route isn't there yet — sequential tasks in this plan build on each other.

- [ ] **Step 1: Add the experience delete-impact query and delete action**

In `lib/admin/api.ts`, find the existing `adminActions` object (ends with the `updateCashoutStatus` entry) and add a new entry. Also add a new exported hook near the other `useAdmin*` query hooks (e.g. right after `useAdminExperiences`, if one exists in this file — otherwise anywhere alongside the other `useQuery`-based hooks).

Add this type near the top of the file, alongside other inline types already in this file (or directly above the hook if this file doesn't group types separately):

```ts
export type ExperienceDeleteImpact = {
  title: string;
  bookingsCount: number;
  paymentsCount: number;
  reviewsCount: number;
  mediaCount: number;
  availabilityCount: number;
};
```

Add the hook:

```ts
export function useExperienceDeleteImpact(experienceId: string | null) {
  return useQuery({
    queryKey: ["admin", "experience-delete-impact", experienceId],
    queryFn: () =>
      rpc<ExperienceDeleteImpact>("admin_get_experience_delete_impact", {
        p_experience_id: experienceId,
      }),
    enabled: Boolean(experienceId),
  });
}
```

Add to the `adminActions` object (alongside the existing entries, e.g. right after `deleteReview`):

```ts
  deleteExperience: (experienceId: string) => ({
    fn: "admin_delete_experience",
    args: { p_experience_id: experienceId },
  }),
```

- [ ] **Step 2: Add the user delete-impact query and delete mutation**

Add this type alongside `ExperienceDeleteImpact`:

```ts
export type UserDeleteImpact = {
  isHost: boolean;
  isAdmin: boolean;
  experiencesCount: number;
  bookingsAsGuestCount: number;
  bookingsAsHostCount: number;
  paymentsAsPayerCount: number;
  reviewsCount: number;
};
```

Add the hook, alongside `useExperienceDeleteImpact`:

```ts
export function useUserDeleteImpact(userId: string | null) {
  return useQuery({
    queryKey: ["admin", "user-delete-impact", userId],
    queryFn: () =>
      rpc<UserDeleteImpact>("admin_get_user_delete_impact", { p_user_id: userId }),
    enabled: Boolean(userId),
  });
}
```

User deletion doesn't go through `rpc()`/`useAdminMutation()` like every other admin action in this file — it needs the `/api/admin/delete-user` route (built in Task 5), since only that route has access to the service-role key. Add this mutation hook near `useAdminMutation`:

```ts
export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your session expired. Please log in again.");

      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || payload.error) {
        throw new Error(payload.error ?? "Failed to delete user.");
      }
      return payload;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. (The `fetch` call to `/api/admin/delete-user` is fine to compile against even though the route doesn't exist until Task 5 — TypeScript doesn't verify route existence.)

- [ ] **Step 4: Commit**

```bash
git add lib/admin/api.ts
git commit -m "feat: add client hooks for experience/user delete-impact preview and deletion"
```

---

### Task 4: Wire "Delete" into the admin experiences page

**Files:**
- Modify: `app/(admin)/admin/experiences/page.tsx`
- Test: manual

**Interfaces:**
- Consumes: `ConfirmDeleteDialog` (Task 2), `useExperienceDeleteImpact` + `adminActions.deleteExperience` (Task 3).

- [ ] **Step 1: Add delete state and the dialog**

In `app/(admin)/admin/experiences/page.tsx`, update the import block (currently lines 1-22):

```tsx
"use client";

import { useState } from "react";
import { Archive, CheckCircle2, Compass, Eye, EyeOff, Search, Trash2, XCircle } from "lucide-react";
import {
  ADMIN_PAGE_SIZE,
  adminActions,
  useAdminExperiences,
  useAdminMutation,
  useExperienceDeleteImpact,
} from "@/lib/admin/api";
import type { ExperienceRow } from "@/lib/admin/types";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import {
  EmptyState,
  FilterChips,
  Pagination,
  SearchInput,
  StatusBadge,
  useDebouncedValue,
} from "@/components/admin/ui/primitives";
import { ActionMenu } from "@/components/admin/ui/ActionMenu";
import { ConfirmDeleteDialog } from "@/components/admin/ui/ConfirmDeleteDialog";
import { formatMoney, formatNumber } from "@/components/admin/ui/format";
```

(Added `Trash2` to the lucide-react import, `useExperienceDeleteImpact` to the `@/lib/admin/api` import, and the new `ConfirmDeleteDialog` import.)

Inside the `AdminExperiencesPage` component, right after the existing state declarations (`const [search, setSearch] = useState(""); ... const debounced = useDebouncedValue(search);`), add:

```tsx
  const [deleteTarget, setDeleteTarget] = useState<ExperienceRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data: deleteImpact, isFetching: isFetchingImpact } = useExperienceDeleteImpact(
    deleteTarget?.id ?? null,
  );
```

Right after the existing `const setStatusFor = (id: string, next: string) => ...` line, add:

```tsx
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    mutation.mutate(adminActions.deleteExperience(deleteTarget.id), {
      onSuccess: () => setDeleteTarget(null),
      onError: (error) => setDeleteError(error instanceof Error ? error.message : "Failed to delete experience."),
    });
  };
```

- [ ] **Step 2: Add the "Delete" item to the row's ActionMenu**

Replace the `actions` column's `ActionMenu` items array (currently lines 96-103):

```tsx
        <ActionMenu
          items={[
            { label: "Publish", icon: Eye, disabled: e.status === "published", onClick: () => setStatusFor(e.id, "published") },
            { label: "Mark in review", icon: Search, disabled: e.status === "in_review", onClick: () => setStatusFor(e.id, "in_review") },
            { label: "Approve", icon: CheckCircle2, disabled: e.status === "approved", onClick: () => setStatusFor(e.id, "approved") },
            { label: "Unpublish", icon: EyeOff, disabled: e.status === "unpublished", onClick: () => setStatusFor(e.id, "unpublished") },
            { label: "Reject", icon: XCircle, danger: true, disabled: e.status === "rejected", onClick: () => setStatusFor(e.id, "rejected") },
            { label: "Archive", icon: Archive, disabled: e.status === "archived", onClick: () => setStatusFor(e.id, "archived") },
          ]}
        />
```

with:

```tsx
        <ActionMenu
          items={[
            { label: "Publish", icon: Eye, disabled: e.status === "published", onClick: () => setStatusFor(e.id, "published") },
            { label: "Mark in review", icon: Search, disabled: e.status === "in_review", onClick: () => setStatusFor(e.id, "in_review") },
            { label: "Approve", icon: CheckCircle2, disabled: e.status === "approved", onClick: () => setStatusFor(e.id, "approved") },
            { label: "Unpublish", icon: EyeOff, disabled: e.status === "unpublished", onClick: () => setStatusFor(e.id, "unpublished") },
            { label: "Reject", icon: XCircle, danger: true, disabled: e.status === "rejected", onClick: () => setStatusFor(e.id, "rejected") },
            { label: "Archive", icon: Archive, disabled: e.status === "archived", onClick: () => setStatusFor(e.id, "archived") },
            {
              label: "Delete",
              icon: Trash2,
              danger: true,
              onClick: () => {
                setDeleteError(null);
                setDeleteTarget(e);
              },
            },
          ]}
        />
```

- [ ] **Step 3: Render the dialog**

Find the component's `return` statement (`return (\n    <DataTable ...`). Wrap it so the dialog renders alongside the table — replace:

```tsx
  return (
    <DataTable
```

with:

```tsx
  return (
    <>
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title={deleteTarget?.title ?? "this experience"}
        loadingImpact={isFetchingImpact}
        submitting={mutation.isPending}
        error={deleteError}
        impactLines={
          deleteImpact
            ? [
                deleteImpact.bookingsCount > 0
                  ? `${deleteImpact.bookingsCount} booking${deleteImpact.bookingsCount === 1 ? "" : "s"}`
                  : null,
                deleteImpact.paymentsCount > 0
                  ? `${deleteImpact.paymentsCount} payment record${deleteImpact.paymentsCount === 1 ? "" : "s"}`
                  : null,
                deleteImpact.reviewsCount > 0
                  ? `${deleteImpact.reviewsCount} review${deleteImpact.reviewsCount === 1 ? "" : "s"}`
                  : null,
                deleteImpact.mediaCount > 0 ? `${deleteImpact.mediaCount} media file${deleteImpact.mediaCount === 1 ? "" : "s"}` : null,
                deleteImpact.availabilityCount > 0
                  ? `${deleteImpact.availabilityCount} availability slot${deleteImpact.availabilityCount === 1 ? "" : "s"}`
                  : null,
              ].filter((line): line is string => line !== null)
            : []
        }
        onConfirm={handleConfirmDelete}
      />
      <DataTable
```

And find the closing of that same `return` statement (currently `footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}\n    />\n  );`) and change the final two lines from:

```tsx
      footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
    />
  );
}
```

to:

```tsx
      footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
      />
    </>
  );
}
```

(This closes the `<DataTable ... />` self-closing tag and then the wrapping `<>...</>` fragment.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, sign in as an admin, visit `/admin/experiences`. Click the row action menu on any experience, confirm a red "Delete" item appears at the bottom. Click it — confirm the dialog opens, shows "Checking what will be deleted…" briefly, then shows real counts (or "No dependent records found." if the experience has none). Click Cancel — confirm it closes without deleting anything. Re-open and click "Permanently delete" on a experience you don't mind losing (or verify the flow up to but not including the final click, if you don't have a safe-to-delete test row) — confirm the row disappears from the table and the dialog closes.

If a headless-Chromium screenshot workflow is available in this environment (one was set up and proven working earlier in this session, driving `localhost:3000` via Playwright), use it here for a visual check of the dialog rather than relying on description alone.

- [ ] **Step 6: Commit**

```bash
git add "app/(admin)/admin/experiences/page.tsx"
git commit -m "feat: add Delete action to the admin experiences table"
```

---

### Task 5: Service-role env var + `/api/admin/delete-user` route

**Files:**
- Modify: `.env.local` (local only — not committed, gitignored)
- Create: `app/api/admin/delete-user/route.ts`
- Test: manual

**Interfaces:**
- Consumes: `admin_prepare_user_deletion` RPC (Task 1).
- Produces: `POST /api/admin/delete-user` accepting `{ userId: string }` with an `Authorization: Bearer <token>` header, returning `{ ok: true }` or `{ error: string }`. Task 3's `useDeleteUserMutation` already calls this exact shape.

- [ ] **Step 1: Add the correctly-named service-role env var locally**

`.env.local` currently stores the Supabase service-role key under `NEXT_PUBLIC_SERVICE_ROLE_KEY` — a risky name, since anything prefixed `NEXT_PUBLIC_` is eligible to be inlined into client bundles by Next.js. This task's new route must read from the correctly-named `SUPABASE_SERVICE_ROLE_KEY` instead (see Global Constraints). Add it locally without ever printing the secret value:

```bash
cd "/home/dev-karanja/Programs/Top View Logo-1/READTRIPS/GOZURU/gozuru"
if grep -q '^SUPABASE_SERVICE_ROLE_KEY=' .env.local; then
  echo "SUPABASE_SERVICE_ROLE_KEY already present in .env.local"
else
  value=$(grep '^NEXT_PUBLIC_SERVICE_ROLE_KEY=' .env.local | sed 's/^NEXT_PUBLIC_SERVICE_ROLE_KEY=//')
  if [ -z "$value" ]; then
    echo "NEXT_PUBLIC_SERVICE_ROLE_KEY not found or empty in .env.local — cannot proceed, report BLOCKED"
  else
    printf '\nSUPABASE_SERVICE_ROLE_KEY=%s\n' "$value" >> .env.local
    echo "Added SUPABASE_SERVICE_ROLE_KEY to .env.local"
  fi
fi
```

Do not print, log, echo, or include the actual key value anywhere in your report or terminal output beyond what the command above already handles internally — only report whether the operation succeeded. This file is gitignored (`.env*` is in `.gitignore`), so this change is local-only and won't be committed; note in your report that the equivalent variable also needs to be added to whatever hosting/deployment environment runs this app in production, since that's outside what a local `.env.local` edit can reach.

- [ ] **Step 2: Write the API route**

Create `app/api/admin/delete-user/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

function getSupabaseWithAuth(accessToken: string) {
  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "Missing auth token. Please log in again." }, { status: 401 });
    }

    const body = (await request.json()) as { userId?: string };
    const targetUserId = body.userId;
    if (!targetUserId) {
      return NextResponse.json({ error: "Missing userId." }, { status: 400 });
    }

    const callerSupabase = getSupabaseWithAuth(accessToken);
    const { data: authData, error: authError } = await callerSupabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Could not verify logged-in user. Please sign in again." },
        { status: 401 },
      );
    }

    // Runs as the calling admin (not the service role): enforces
    // assert_admin(), blocks self-delete and last-admin-delete, and clears
    // the guest-side bookings/payments a database constraint otherwise
    // protects from any other deletion path.
    const { error: prepareError } = await callerSupabase.rpc("admin_prepare_user_deletion", {
      p_user_id: targetUserId,
    });
    if (prepareError) {
      return NextResponse.json({ error: prepareError.message }, { status: 400 });
    }

    // Only the service role can remove an auth.users row — this is the one
    // step in this route that genuinely requires elevated privilege. It
    // cascades profile, host profile, owned experiences, host-side
    // bookings/payments, reviews, favorites, and affiliate data via the
    // existing ON DELETE CASCADE foreign keys.
    const serviceSupabase = createClient(supabaseUrl as string, serviceRoleKey);
    const { error: deleteError } = await serviceSupabase.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error deleting user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Run `npm run dev`. Confirm the route compiles and responds — e.g. `curl -s -X POST http://localhost:3000/api/admin/delete-user -H "Content-Type: application/json" -d '{}'` should return a 401 (`{"error":"Missing auth token. Please log in again."}`), not a 500 crash or a Next.js compile error — this confirms the route loads and the `serviceRoleKey` check/env wiring from Step 1 is working. Full end-to-end verification (an actual successful delete) happens in Task 6, once there's a UI to drive it from.

- [ ] **Step 5: Commit**

```bash
git add "app/api/admin/delete-user/route.ts"
git commit -m "feat: add server-side admin delete-user API route"
```

Do NOT `git add .env.local` — confirm it's not staged (`git status` should not list it; it's gitignored).

---

### Task 6: Wire "Delete" into the admin users page

**Files:**
- Modify: `app/(admin)/admin/users/page.tsx`
- Test: manual

**Interfaces:**
- Consumes: `ConfirmDeleteDialog` (Task 2), `useUserDeleteImpact` + `useDeleteUserMutation` (Task 3), `/api/admin/delete-user` (Task 5).

- [ ] **Step 1: Add delete state, the mutation, and the dialog**

In `app/(admin)/admin/users/page.tsx`, update the import block (currently lines 1-22):

```tsx
"use client";

import { useState } from "react";
import { ShieldCheck, ShieldOff, Trash2, Users } from "lucide-react";
import {
  ADMIN_PAGE_SIZE,
  adminActions,
  useAdminMutation,
  useAdminUsers,
  useDeleteUserMutation,
  useUserDeleteImpact,
} from "@/lib/admin/api";
import type { UserRow } from "@/lib/admin/types";
import { DataTable, type Column } from "@/components/admin/ui/DataTable";
import {
  Avatar,
  EmptyState,
  Pagination,
  SearchInput,
  useDebouncedValue,
} from "@/components/admin/ui/primitives";
import { ActionMenu } from "@/components/admin/ui/ActionMenu";
import { ConfirmDeleteDialog } from "@/components/admin/ui/ConfirmDeleteDialog";
import { formatDate, formatNumber } from "@/components/admin/ui/format";
import { cn } from "@/lib/utils";
```

(Added `Trash2` to lucide-react, `useDeleteUserMutation` + `useUserDeleteImpact` to the `@/lib/admin/api` import, and the `ConfirmDeleteDialog` import.)

Inside `AdminUsersPage`, right after the existing state (`const [search, setSearch] = useState(""); ... const debounced = useDebouncedValue(search);`), add:

```tsx
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { data: deleteImpact, isFetching: isFetchingImpact } = useUserDeleteImpact(
    deleteTarget?.user_id ?? null,
  );
  const deleteUserMutation = useDeleteUserMutation();
```

Right after `const mutation = useAdminMutation();`, add:

```tsx
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    deleteUserMutation.mutate(deleteTarget.user_id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (error) => setDeleteError(error instanceof Error ? error.message : "Failed to delete user."),
    });
  };
```

- [ ] **Step 2: Add the "Delete" item to the row's ActionMenu**

Replace the `actions` column (currently lines 92-113):

```tsx
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) => (
        <ActionMenu
          items={[
            u.is_admin
              ? {
                  label: "Revoke admin",
                  icon: ShieldOff,
                  danger: true,
                  onClick: () => mutation.mutate(adminActions.setAdminRole(u.user_id, false)),
                }
              : {
                  label: "Make admin",
                  icon: ShieldCheck,
                  onClick: () => mutation.mutate(adminActions.setAdminRole(u.user_id, true)),
                },
          ]}
        />
      ),
    },
```

with:

```tsx
    {
      key: "actions",
      header: "",
      align: "right",
      render: (u) => (
        <ActionMenu
          items={[
            u.is_admin
              ? {
                  label: "Revoke admin",
                  icon: ShieldOff,
                  danger: true,
                  onClick: () => mutation.mutate(adminActions.setAdminRole(u.user_id, false)),
                }
              : {
                  label: "Make admin",
                  icon: ShieldCheck,
                  onClick: () => mutation.mutate(adminActions.setAdminRole(u.user_id, true)),
                },
            {
              label: "Delete",
              icon: Trash2,
              danger: true,
              onClick: () => {
                setDeleteError(null);
                setDeleteTarget(u);
              },
            },
          ]}
        />
      ),
    },
```

- [ ] **Step 3: Render the dialog**

Find the component's `return` statement. Replace:

```tsx
  return (
    <DataTable
```

with:

```tsx
  return (
    <>
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title={deleteTarget?.name ?? deleteTarget?.email ?? "this user"}
        loadingImpact={isFetchingImpact}
        submitting={deleteUserMutation.isPending}
        error={deleteError}
        impactLines={
          deleteImpact
            ? [
                deleteImpact.isHost && deleteImpact.experiencesCount > 0
                  ? `${deleteImpact.experiencesCount} experience${deleteImpact.experiencesCount === 1 ? "" : "s"} they host`
                  : null,
                deleteImpact.bookingsAsGuestCount > 0
                  ? `${deleteImpact.bookingsAsGuestCount} booking${deleteImpact.bookingsAsGuestCount === 1 ? "" : "s"} they made`
                  : null,
                deleteImpact.bookingsAsHostCount > 0
                  ? `${deleteImpact.bookingsAsHostCount} booking${deleteImpact.bookingsAsHostCount === 1 ? "" : "s"} on their experiences`
                  : null,
                deleteImpact.paymentsAsPayerCount > 0
                  ? `${deleteImpact.paymentsAsPayerCount} payment record${deleteImpact.paymentsAsPayerCount === 1 ? "" : "s"}`
                  : null,
                deleteImpact.reviewsCount > 0
                  ? `${deleteImpact.reviewsCount} review${deleteImpact.reviewsCount === 1 ? "" : "s"} they wrote`
                  : null,
              ].filter((line): line is string => line !== null)
            : []
        }
        onConfirm={handleConfirmDelete}
      />
      <DataTable
```

Find the closing (currently `footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}\n    />\n  );`) and change to:

```tsx
      footer={<Pagination page={page} pageSize={ADMIN_PAGE_SIZE} total={total} onPage={setPage} />}
      />
    </>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

This is the first point the full user-deletion flow can be tested end-to-end (Task 5's route needed a UI to drive it). Run `npm run dev`, sign in as an admin, visit `/admin/users`. Click a row's action menu, confirm "Delete" appears (red). Click it — confirm the dialog opens and shows real impact counts for a user with some history, and "No dependent records found." for one without. Test the guardrails specifically:
- Try to delete yourself (the currently logged-in admin's own row, if visible in the list) — confirm it fails with the "You cannot delete your own account." message surfaced in the dialog's error area, not a silent failure or a crash.
- If there is exactly one admin in this database (yourself), confirm the flow doesn't let you delete the last admin (either by trying, or by reasoning about it if there's no safe second test — do not actually delete yourself to test this).
- Successfully delete a genuinely disposable test user (one with no real data you care about) and confirm: the row disappears from `/admin/users`, and if that user had any experiences, those also disappear from `/admin/experiences` on a refresh.

If the headless-Chromium screenshot workflow from earlier in this session is available, use it to visually confirm the dialog renders correctly for a user with a non-trivial impact list (multiple bullet points).

- [ ] **Step 6: Commit**

```bash
git add "app/(admin)/admin/users/page.tsx"
git commit -m "feat: add Delete action to the admin users table"
```

---

### Task 7: Full integration pass

**Files:** none modified — verification only.

**Interfaces:** none.

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: build succeeds with no type errors, including the new `app/api/admin/delete-user/route.ts` route compiling as a dynamic API route.

- [ ] **Step 2: Confirm the migration's manual-application status is clearly communicated**

Re-read the report from Task 1. Confirm it's unambiguous that `supabase/migrations/20260810_023_admin_delete_actions.sql` has NOT been applied to any database yet — this needs to be surfaced clearly in your final summary to the user, the same way the currency-defaults migration from an earlier phase was flagged. Nothing in this feature will actually work against the real database until that migration runs.

- [ ] **Step 3: Full manual click-through**

Run `npm run dev`. Walk through, in order:
1. `/admin/experiences` — Delete action present, dialog shows real counts, cancel works, delete works (on a disposable test row) and removes it from the table.
2. `/admin/users` — Delete action present, dialog shows real counts including host-owned-experience counts when relevant, self-delete is blocked with a visible error message, last-admin-delete is blocked (or reasoned about safely, per Task 6 Step 5), delete works on a disposable test user and cascades their owned experiences too.
3. Confirm `.env.local` has `SUPABASE_SERVICE_ROLE_KEY` set (without printing its value) and that it was NOT accidentally staged or committed to git anywhere in this plan's commits: `git log --all --oneline -- .env.local` should return nothing, and `git show --stat HEAD~6..HEAD | grep -i env` (adjust the range to cover this plan's commits) should not mention `.env.local`.

Report any issue found. If it's a small, unambiguous fix, make it and commit separately with a descriptive message. If it's ambiguous or would require a design decision (e.g. the migration can't be verified against the live schema because it hasn't been applied yet, and something about its behavior is genuinely uncertain), report it clearly instead of guessing.
