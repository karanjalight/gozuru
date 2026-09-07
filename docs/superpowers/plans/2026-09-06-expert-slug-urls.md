# Expert Detail Slug URLs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move expert detail pages from `/hosts/<uuid>` to `/experts/<slug>`, with a stable auto-generated slug and a permanent redirect for old links.

**Architecture:** A new `slug` column on `host_profiles` is populated by a `BEFORE INSERT OR UPDATE` Postgres trigger (never by app code), so every one of the three existing ways a `host_profiles` row gets created — `AuthProvider.updateProfile`'s upsert, the bare upsert in `app/account/experiences/create/page.tsx`, and the `ensure_host_profile_from_role()` trigger that fires on host signup — gets a slug automatically, and a slug never changes once assigned. The current client-rendered detail page moves from `app/(landing)/hosts/[hostId]/page.tsx` to `app/(landing)/experts/[slug]/page.tsx`, gaining one extra query (slug → user_id) before its existing data flow. The old path becomes a thin server component that resolves the old uuid to a slug and issues a permanent redirect.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (Postgres + JS client), Tailwind v4.

## Global Constraints

- No test framework exists in this repo. Verification throughout this plan is manual/build-only: `npx tsc --noEmit` after every task, `npm run build` at the end, plus manual click-through in the dev server.
- New SQL functions follow the exact pattern already established in this codebase (e.g. `ensure_host_profile_from_role()` and `handle_new_auth_user()` in `supabase/migrations/20260410_001_initial_gozuru_schema.sql`): `language plpgsql`, `security definer`, `set search_path = public` for any function touching tables other than via `NEW`/`OLD`. Trigger creation always pairs `drop trigger if exists ... ;` with `create trigger ...` on its own statement, matching the naming convention `trg_<table>_<purpose>`.
- RLS is disabled on `host_profiles`/`profiles` repo-wide (confirmed via `supabase/migrations/20260423_003_drop_all_rls.sql`) — no policy work needed for the new column.
- **The new migration is NOT applied automatically as part of this plan** (matches the existing convention — the currency-defaults migration from an earlier phase was also left for manual application, and remains unapplied per project notes). It must be run via `supabase db push` or pasted into the Supabase SQL Editor before any of this feature works end-to-end. State this explicitly and unambiguously in Task 1's completion report and again in the final task.
- Auto-generated slugs only — no editable-slug UI in this plan (explicit product decision from the approved design spec).
- Every internal link that currently points at `/hosts/<uuid>` must be updated to `/experts/<slug>` — an incomplete sweep leaves dead links, so Task 5 is not done until all four listed call sites are changed.

---

### Task 1: Database — `host_profiles.slug` column, generator, trigger, backfill

**Files:**
- Create: `supabase/migrations/20260906_023_host_profiles_slug.sql`
- Test: manual (no test framework — see Global Constraints)

**Interfaces:**
- Produces: `host_profiles.slug` (`text`, unique, not null after backfill), populated automatically on insert/update whenever it is `NULL`. Task 2, 4, and 5 all `select(...slug...)` or `.eq("slug", ...)` against this column.

This migration needs to be applied to the live database (and your local dev database, if you use one) before any later task can be manually verified end-to-end. It will NOT be applied automatically by this plan — no database credentials are available for that, and it's a deliberate manual step, exactly like the currency-defaults migration from an earlier phase.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260906_023_host_profiles_slug.sql`:

```sql
-- Auto-generate a stable, human-friendly slug for host_profiles rows so
-- expert detail pages can live at /experts/<slug> instead of /hosts/<uuid>.
-- Slugs are assigned once (on whichever insert/update first leaves the
-- column NULL) and never regenerated afterward, so a published URL never
-- changes just because the host edits their name later.

alter table public.host_profiles add column if not exists slug text;

create or replace function public.slugify(p_input text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from regexp_replace(lower(coalesce(p_input, '')), '[^a-z0-9]+', '-', 'g')),
    ''
  );
$$;

create or replace function public.generate_unique_host_slug(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_email text;
  v_base text;
  v_candidate text;
  v_suffix int := 1;
begin
  select p.display_name, p.email
  into v_display_name, v_email
  from public.profiles p
  where p.user_id = p_user_id;

  v_base := coalesce(
    public.slugify(v_display_name),
    public.slugify(split_part(coalesce(v_email, ''), '@', 1)),
    'host'
  );
  v_base := left(v_base, 60);
  v_candidate := v_base;

  while exists (
    select 1 from public.host_profiles h
    where h.slug = v_candidate and h.user_id <> p_user_id
  ) loop
    v_suffix := v_suffix + 1;
    v_candidate := left(v_base, 60) || '-' || v_suffix;
  end loop;

  return v_candidate;
end;
$$;

create or replace function public.host_profiles_set_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slug is null then
    new.slug := public.generate_unique_host_slug(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_host_profiles_set_slug on public.host_profiles;
create trigger trg_host_profiles_set_slug
before insert or update on public.host_profiles
for each row execute function public.host_profiles_set_slug();

-- Backfill existing rows (runs through the same generator, not the trigger).
update public.host_profiles
set slug = public.generate_unique_host_slug(user_id)
where slug is null;

alter table public.host_profiles alter column slug set not null;
alter table public.host_profiles add constraint host_profiles_slug_key unique (slug);
```

- [ ] **Step 2: Cross-check the migration against the full schema history**

Before treating this as done, confirm `host_profiles` and `profiles` haven't been altered by any migration after the initial schema (which would change the columns this migration reads):

```bash
grep -rn "alter table public.\(host_profiles\|profiles\)" supabase/migrations/*.sql
```

Expected: only the two `enable row level security` lines from `20260410_001_initial_gozuru_schema.sql`. If a later migration renamed or dropped `profiles.display_name`, `profiles.email`, or `host_profiles.user_id`, fix the migration file to match the actual current schema, not this plan's description of it.

- [ ] **Step 3: Confirm no naming collisions**

```bash
grep -rln "slugify\|generate_unique_host_slug\|host_profiles_set_slug\|trg_host_profiles_set_slug\|host_profiles_slug_key" supabase/migrations/*.sql
```

Expected: only the new file itself once created (this returns no matches before Step 1 is committed — verified during planning).

- [ ] **Step 4: Report the migration as ready for manual application**

In your completion report for this task, state clearly: "This migration has not been applied to any database — it needs to be run via `supabase db push` or pasted into the Supabase SQL Editor before the feature works end-to-end." Do not attempt to apply it yourself.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260906_023_host_profiles_slug.sql
git commit -m "$(cat <<'EOF'
feat: add host_profiles.slug for expert detail URLs

Auto-generated once via a BEFORE INSERT OR UPDATE trigger from the
host's display name (falling back to their email local-part), unique,
never regenerated. Not yet applied to any database.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Move the expert detail page to `/experts/[slug]`

**Files:**
- Create: `app/(landing)/experts/[slug]/page.tsx`
- Test: manual (see Step 4)

**Interfaces:**
- Consumes: `host_profiles.slug` (Task 1).
- Produces: the live route `/experts/[slug]`. Task 5's link updates point here.

**Note:** this task creates the new page but does not yet touch `app/(landing)/hosts/[hostId]/page.tsx` — that becomes the redirect stub in Task 3. Until Task 3 lands, both routes independently resolve real host data; that's expected and harmless.

- [ ] **Step 1: Create the new page**

Create `app/(landing)/experts/[slug]/page.tsx` (adapted from the current `app/(landing)/hosts/[hostId]/page.tsx`, with the identity-resolution step added at the top of `load()` and every `hostId`/`isInvalidHost` identifier renamed to `slug`/`isInvalidSlug`):

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildCoverByExperienceId,
  type ExperienceMediaItem,
  type ExperienceMediaRowInput,
} from "@/lib/experience-media";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HostProfilePortfolio } from "../../components/HostProfilePortfolio";
import { HostProfilePortfolioSkeleton } from "../../components/LoadingSkeletons";
import { Navbar } from "../../components/Navbar";

type ExperienceListRow = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price_amount: number | null;
  currency: string;
  duration_minutes: number | null;
  max_guests: number | null;
  categories: { name: string } | { name: string }[] | null;
  experience_locations:
    | { city: string | null; country_region: string | null }
    | { city: string | null; country_region: string | null }[]
    | null;
};

type MediaRow = {
  experience_id: string;
  storage_path: string;
  sort_order: number;
  media_type?: string | null;
};

type HostProfileRow = {
  user_id: string;
  headline: string | null;
  expertise: string | null;
  years_experience: number | null;
  career_highlight: string | null;
  highlight_story: string | null;
  verification_status: string | null;
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  city: string | null;
  country_code: string | null;
};

type HostSocialRow = {
  id: string;
  url: string;
};

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&h=400&fit=crop";

function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return [
      "images.unsplash.com",
      "images.pexels.com",
      "omeztanuxcfpmnpenicd.supabase.co",
    ].includes(url.hostname);
  } catch {
    return value.startsWith("/");
  }
}

function publicStorageUrl(bucket: string, path?: string | null): string | null {
  const value = path?.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return isSafeImageUrl(value) ? value : null;
  }
  return supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl;
}

function normalizeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function socialLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes("linkedin")) return "LinkedIn";
    if (hostname.includes("instagram")) return "Instagram";
    if (hostname.includes("twitter") || hostname.includes("x.com")) return "X";
    if (hostname.includes("youtube")) return "YouTube";
    if (hostname.includes("facebook")) return "Facebook";
    return hostname;
  } catch {
    return "Website";
  }
}

function pickLocationRow(row: ExperienceListRow): { city: string | null; country_region: string | null } | null {
  const loc = row.experience_locations;
  if (!loc) return null;
  if (Array.isArray(loc)) return loc[0] ?? null;
  return loc;
}

function locationLabel(row: ExperienceListRow): string {
  const loc = pickLocationRow(row);
  if (!loc) return "";
  if (loc.city && loc.country_region) return `${loc.city}, ${loc.country_region}`;
  return loc.city || loc.country_region || "";
}

function pickCategory(row: ExperienceListRow): string | null {
  const cat = row.categories;
  if (!cat) return null;
  if (Array.isArray(cat)) return cat[0]?.name ?? null;
  return cat.name;
}

function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <Navbar />
      <main className={cn("pt-16", className)}>{children}</main>
    </>
  );
}

export default function HostProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hostProfile, setHostProfile] = useState<HostProfileRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [socialLinks, setSocialLinks] = useState<HostSocialRow[]>([]);
  const [experiences, setExperiences] = useState<ExperienceListRow[]>([]);
  const [coverByExperienceId, setCoverByExperienceId] = useState<
    Record<string, ExperienceMediaItem>
  >({});

  const isInvalidSlug = useMemo(() => !slug, [slug]);

  useEffect(() => {
    if (isInvalidSlug) return;

    let mounted = true;

    const load = async () => {
      setLoading(true);
      setNotFound(false);

      const { data: hostRow, error: hostError } = await supabase
        .from("host_profiles")
        .select(
          "user_id,headline,expertise,years_experience,career_highlight,highlight_story,verification_status",
        )
        .eq("slug", slug)
        .maybeSingle();

      if (!mounted) return;

      if (hostError || !hostRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const hostId = hostRow.user_id;

      const [
        { data: expRows, error: expError },
        { data: profileRow },
        { data: socialRows },
      ] = await Promise.all([
        supabase
          .from("experiences")
          .select(
            "id,title,subtitle,description,price_amount,currency,duration_minutes,max_guests,categories(name),experience_locations(city,country_region)",
          )
          .eq("host_user_id", hostId)
          .eq("status", "published")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("first_name,last_name,avatar_path,bio,city,country_code")
          .eq("user_id", hostId)
          .maybeSingle(),
        supabase.from("host_social_links").select("id,url").eq("host_user_id", hostId).limit(8),
      ]);

      if (!mounted) return;

      if (expError) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const rows = (expRows ?? []) as unknown as ExperienceListRow[];
      setExperiences(rows);
      setHostProfile(hostRow as HostProfileRow);
      setProfile((profileRow ?? null) as ProfileRow | null);
      setSocialLinks((socialRows ?? []) as HostSocialRow[]);

      const ids = rows.map((r) => r.id);
      const { data: mediaRows } =
        ids.length > 0
          ? await supabase
              .from("experience_media")
              .select("experience_id,storage_path,sort_order,media_type")
              .in("experience_id", ids)
              .order("sort_order", { ascending: true })
          : { data: [] as MediaRow[] };

      if (!mounted) return;

      setCoverByExperienceId(
        buildCoverByExperienceId(supabase, (mediaRows ?? []) as ExperienceMediaRowInput[]),
      );
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [slug, isInvalidSlug]);

  const bannerImage = useMemo(() => {
    const first = experiences[0];
    if (!first) return FALLBACK_COVER;
    return coverByExperienceId[first.id]?.url ?? FALLBACK_COVER;
  }, [coverByExperienceId, experiences]);

  if (isInvalidSlug) {
    return (
      <PageShell className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h1 className="pt-8 text-2xl font-semibold">Invalid profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">This link is not valid.</p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "default" }),
            "mt-6 rounded-full bg-orange-500 text-white hover:bg-orange-600",
          )}
        >
          Back home
        </Link>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell>
        <HostProfilePortfolioSkeleton />
      </PageShell>
    );
  }

  if (notFound || !hostProfile) {
    return (
      <PageShell className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h1 className="pt-8 text-2xl font-semibold">Expert not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This profile is unavailable or has not been activated yet.
        </p>
        <Link
          href="/experiences"
          className={cn(
            buttonVariants({ variant: "default" }),
            "mt-6 rounded-full bg-orange-500 text-white hover:bg-orange-600",
          )}
        >
          Browse experiences
        </Link>
      </PageShell>
    );
  }

  const profileName =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Gozuru Expert";
  const headline =
    hostProfile.headline?.trim() ||
    hostProfile.career_highlight?.trim() ||
    "Local expert on Gozuru";
  const aboutText =
    profile?.bio?.trim() ||
    hostProfile.highlight_story?.trim() ||
    hostProfile.expertise?.trim() ||
    "Passionate about sharing authentic local knowledge through immersive, host-led experiences.";
  const expertiseText = hostProfile.expertise?.trim();
  const careerHighlight = hostProfile.career_highlight?.trim();
  const highlightStory = hostProfile.highlight_story?.trim();
  const yearsExperience =
    typeof hostProfile.years_experience === "number" && hostProfile.years_experience > 0
      ? hostProfile.years_experience
      : null;
  const experienceLocations = [
    ...new Set(experiences.map((exp) => locationLabel(exp)).filter(Boolean)),
  ];
  const profileLocation = [profile?.city, profile?.country_code].filter(Boolean).join(", ");
  const primaryLocation =
    profileLocation || experienceLocations[0] || "Available globally";
  const isVerified = hostProfile.verification_status === "approved";
  const avatarUrl = publicStorageUrl("avatars", profile?.avatar_path);
  const focusAreas = (expertiseText || aboutText)
    .split(/[,.\n]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 3)
    .slice(0, 6);
  const safeSocialLinks = socialLinks
    .map((social) => {
      const url = normalizeExternalUrl(social.url);
      if (!url) return null;
      return { id: social.id, url, label: socialLabel(url) };
    })
    .filter((social): social is { id: string; url: string; label: string } => Boolean(social));

  const portfolioExperiences = experiences.map((exp) => ({
    id: exp.id,
    title: exp.title,
    subtitle: exp.subtitle,
    description: exp.description,
    price_amount: exp.price_amount,
    currency: exp.currency,
    duration_minutes: exp.duration_minutes,
    max_guests: exp.max_guests,
    category: pickCategory(exp),
    location: locationLabel(exp),
    coverMedia: coverByExperienceId[exp.id],
  }));

  return (
    <PageShell>
      <HostProfilePortfolio
        profileName={profileName}
        headline={headline}
        aboutText={aboutText}
        expertiseText={expertiseText}
        careerHighlight={careerHighlight}
        highlightStory={highlightStory}
        primaryLocation={primaryLocation}
        yearsExperience={yearsExperience}
        isVerified={isVerified}
        avatarUrl={avatarUrl}
        bannerImage={bannerImage}
        experiences={portfolioExperiences}
        focusAreas={focusAreas}
        socialLinks={safeSocialLinks}
      />
    </PageShell>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Confirm the old route still exists unmodified**

```bash
git status
```

Expected: only `app/(landing)/experts/[slug]/page.tsx` shows as a new/untracked file — `app/(landing)/hosts/[hostId]/page.tsx` is untouched (that's Task 3).

- [ ] **Step 4: Manual check (requires Task 1's migration applied to your dev database)**

Start the dev server (`npm run dev`), find a real host's `user_id` (e.g. via the admin hosts page or a `select user_id, slug from host_profiles limit 5;` query), and visit `/experts/<their-slug>`. Confirm the profile renders exactly as `/hosts/<uuid>` did before. Then visit `/experts/does-not-exist` and confirm the "Expert not found" state renders (not a crash).

- [ ] **Step 5: Commit**

```bash
git add "app/(landing)/experts/[slug]/page.tsx"
git commit -m "$(cat <<'EOF'
feat: add /experts/[slug] expert detail page

Resolves slug to a host_user_id via host_profiles.slug, then runs the
same data flow the old /hosts/[hostId] page used. The old route is
converted to a redirect stub in the next commit.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Convert `/hosts/[hostId]` into a permanent-redirect stub

**Files:**
- Modify: `app/(landing)/hosts/[hostId]/page.tsx` (full rewrite — entire file replaced)

**Interfaces:**
- Consumes: `host_profiles.slug` (Task 1), the anon-key server client pattern from `lib/queries/experts-server.ts`.
- Produces: nothing consumed by later tasks — this is a leaf.

- [ ] **Step 1: Replace the file's contents**

Replace the entire contents of `app/(landing)/hosts/[hostId]/page.tsx` with:

```tsx
import { createClient } from "@supabase/supabase-js";
import { notFound, permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ hostId: string }>;
};

function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export default async function LegacyHostProfileRedirect({ params }: PageProps) {
  const { hostId } = await params;
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("host_profiles")
    .select("slug")
    .eq("user_id", hostId)
    .maybeSingle();

  if (!data?.slug) {
    notFound();
  }

  permanentRedirect(`/experts/${data.slug}`);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check (requires Task 1's migration applied)**

With the dev server running, visit `/hosts/<a-real-host-user_id>` and confirm the browser lands on `/experts/<their-slug>`. Open devtools' Network tab and confirm the initial document request for `/hosts/<uuid>` returns a 308 (Next's `permanentRedirect` uses 308). Then visit `/hosts/00000000-0000-0000-0000-000000000000` (a uuid with no matching row) and confirm a 404 page renders.

- [ ] **Step 4: Commit**

```bash
git add "app/(landing)/hosts/[hostId]/page.tsx"
git commit -m "$(cat <<'EOF'
refactor: turn /hosts/[hostId] into a redirect to /experts/[slug]

Old UUID profile links keep working via a permanent (308) redirect
instead of 404ing, in case any were already bookmarked or shared.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add `slug` to the shared experts query layer

**Files:**
- Modify: `lib/queries/experts.ts:7-15` (`HostProfileRow` type), `lib/queries/experts.ts:96-139` (`mapHostToLocalExpert`)
- Modify: `lib/queries/experts-server.ts:34-40` (the `host_profiles` select)

**Interfaces:**
- Consumes: `host_profiles.slug` (Task 1).
- Produces: `LocalExpert.profileHref` now resolves to `/experts/<slug>`. Task 5's `AgentCard.tsx`/`HeroExperts.tsx` fallback-href changes are cosmetic only, since `profileHref` is always populated by this task's output — but update them anyway per the Global Constraints "no dead old-scheme links" rule.

- [ ] **Step 1: Add `slug` to `HostProfileRow` and use it in `profileHref`**

In `lib/queries/experts.ts`, change:

```ts
export type HostProfileRow = {
  user_id: string;
  headline: string | null;
  expertise: string | null;
  years_experience: number | null;
  career_highlight: string | null;
  highlight_story: string | null;
  verification_status: string | null;
};
```

to:

```ts
export type HostProfileRow = {
  user_id: string;
  slug: string;
  headline: string | null;
  expertise: string | null;
  years_experience: number | null;
  career_highlight: string | null;
  highlight_story: string | null;
  verification_status: string | null;
};
```

Then in `mapHostToLocalExpert`, change:

```ts
    profileHref: `/hosts/${hostId}`,
```

to:

```ts
    profileHref: `/experts/${host?.slug ?? hostId}`,
```

- [ ] **Step 2: Select `slug` in the server query**

In `lib/queries/experts-server.ts`, change:

```ts
  const { data: hostRows, error: hostError } = await supabase
    .from("host_profiles")
    .select(
      "user_id,headline,expertise,years_experience,career_highlight,highlight_story,verification_status",
    )
```

to:

```ts
  const { data: hostRows, error: hostError } = await supabase
    .from("host_profiles")
    .select(
      "user_id,slug,headline,expertise,years_experience,career_highlight,highlight_story,verification_status",
    )
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual check (requires Task 1's migration applied)**

Run the dev server, visit `/experts`, inspect a card's "View profile" link (or click it) and confirm it points at `/experts/<slug>`, not `/hosts/<uuid>`.

- [ ] **Step 5: Commit**

```bash
git add lib/queries/experts.ts lib/queries/experts-server.ts
git commit -m "$(cat <<'EOF'
feat: build expert profileHref from host_profiles.slug

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Update remaining internal links to `/experts/<slug>`

**Files:**
- Modify: `app/(landing)/components/sections/AgentCard.tsx:20`
- Modify: `app/(landing)/components/HeroExperts.tsx:159`
- Modify: `app/(landing)/components/sections/ExperienceHostGrid.tsx:27-34` (type), `:164` (select), `:237` (href builder)
- Modify: `app/(landing)/experiences/[experienceId]/page.tsx:70-74` (type), `:233` (select), `:683` (link)

**Interfaces:**
- Consumes: `host_profiles.slug` (Task 1). `ExperienceHostGrid.tsx` and `experiences/[experienceId]/page.tsx` each run their own `host_profiles` queries independent of `lib/queries/experts.ts` — they need their own `slug` selects, not just Task 4's change.

- [ ] **Step 1: `AgentCard.tsx` fallback href**

In `app/(landing)/components/sections/AgentCard.tsx`, change:

```ts
  const profileHref = agent.profileHref ?? `/hosts/${agent.id}`;
```

to:

```ts
  const profileHref = agent.profileHref ?? `/experts/${agent.id}`;
```

(`agent.profileHref` is always populated by Task 4's `mapHostToLocalExpert`, so this fallback is defensive-only — it keeps the old-scheme URL from ever appearing again if it's ever hit.)

- [ ] **Step 2: `HeroExperts.tsx` fallback href**

In `app/(landing)/components/HeroExperts.tsx`, change:

```tsx
                        href={expert.profileHref ?? `/hosts/${expert.id}`}
```

to:

```tsx
                        href={expert.profileHref ?? `/experts/${expert.id}`}
```

- [ ] **Step 3: `ExperienceHostGrid.tsx` — select slug and build the new href**

In `app/(landing)/components/sections/ExperienceHostGrid.tsx`, change the local type:

```ts
type HostProfileRow = {
  user_id: string;
  headline: string | null;
  expertise: string | null;
  years_experience: number | null;
  career_highlight: string | null;
  highlight_story: string | null;
};
```

to:

```ts
type HostProfileRow = {
  user_id: string;
  slug: string;
  headline: string | null;
  expertise: string | null;
  years_experience: number | null;
  career_highlight: string | null;
  highlight_story: string | null;
};
```

Change the select:

```ts
      const { data: hostRows, error: hostError } = await supabase
        .from("host_profiles")
        .select("user_id,headline,expertise,years_experience,career_highlight,highlight_story")
```

to:

```ts
      const { data: hostRows, error: hostError } = await supabase
        .from("host_profiles")
        .select("user_id,slug,headline,expertise,years_experience,career_highlight,highlight_story")
```

Change the href builder:

```ts
        hrefs[host.user_id] = `/hosts/${host.user_id}`;
```

to:

```ts
        hrefs[host.user_id] = `/experts/${host.slug}`;
```

- [ ] **Step 4: `experiences/[experienceId]/page.tsx` — select slug and build the new link**

In `app/(landing)/experiences/[experienceId]/page.tsx`, change the type:

```ts
type HostProfileRow = {
  headline: string | null;
  expertise: string | null;
  highlight_story: string | null;
};
```

to:

```ts
type HostProfileRow = {
  slug: string | null;
  headline: string | null;
  expertise: string | null;
  highlight_story: string | null;
};
```

Change the select:

```ts
            supabase
              .from("host_profiles")
              .select("headline,expertise,highlight_story")
              .eq("user_id", experienceRow.host_user_id)
              .maybeSingle(),
```

to:

```ts
            supabase
              .from("host_profiles")
              .select("slug,headline,expertise,highlight_story")
              .eq("user_id", experienceRow.host_user_id)
              .maybeSingle(),
```

Change the link (falls back to the `/experts` list if the host's slug is somehow unavailable, rather than linking to a `/experts/undefined` dead page):

```tsx
                    <Link
                      href={`/hosts/${experience.host_user_id}`}
```

to:

```tsx
                    <Link
                      href={hostProfile?.slug ? `/experts/${hostProfile.slug}` : "/experts"}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual check (requires Task 1's migration applied)**

With the dev server running: on the homepage, confirm the "Meet our experts" grid cards link to `/experts/<slug>`; type an expert's name into the hero search bar and confirm the suggestion dropdown links to `/experts/<slug>`; open any published experience's detail page and confirm "View expert profile" links to `/experts/<slug>`.

- [ ] **Step 7: Commit**

```bash
git add "app/(landing)/components/sections/AgentCard.tsx" \
        "app/(landing)/components/HeroExperts.tsx" \
        "app/(landing)/components/sections/ExperienceHostGrid.tsx" \
        "app/(landing)/experiences/[experienceId]/page.tsx"
git commit -m "$(cat <<'EOF'
feat: point remaining expert links at /experts/[slug]

Covers the homepage expert grid, hero search suggestions, and the
"View expert profile" link on experience detail pages.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Update the SEO spec's URL references

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-seo-improvements-design.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Update the sitemap section**

In `docs/superpowers/specs/2026-08-10-seo-improvements-design.md`, find (§3.2):

```
  - Every host with at least one published experience — same "published host" rule already implemented in `fetchLandingExpertsServer` (`lib/queries/experts-server.ts`, the `publishedHostIds` derivation) — reused, not reimplemented, → `/hosts/[hostId]`.
```

Replace with:

```
  - Every host with at least one published experience — same "published host" rule already implemented in `fetchLandingExpertsServer` (`lib/queries/experts-server.ts`, the `publishedHostIds` derivation) — reused, not reimplemented, → `/experts/[slug]` (see [[2026-09-06-expert-slug-urls-design]] — `/hosts/[hostId]` is now a permanent-redirect stub, not the canonical page).
```

- [ ] **Step 2: Update the Phase B heading and path**

Find (§4.2):

```
### 4.2 `/hosts/[hostId]`

- Same split: rename current `page.tsx` to `HostProfileClient.tsx`, add a server `page.tsx` with `generateMetadata` (host name, headline/bio, avatar, `alternates.canonical: /hosts/[id]`) and a JSON-LD `<script>` (built by `buildJsonLdHostProfile(...)`).
```

Replace with:

```
### 4.2 `/experts/[slug]`

- Same split: rename current `app/(landing)/experts/[slug]/page.tsx` content to `HostProfileClient.tsx`, add a server `page.tsx` with `generateMetadata` (host name, headline/bio, avatar, `alternates.canonical: /experts/[slug]`) and a JSON-LD `<script>` (built by `buildJsonLdHostProfile(...)`). `/hosts/[hostId]` (see [[2026-09-06-expert-slug-urls-design]]) stays a permanent-redirect stub and is excluded from the sitemap.
```

- [ ] **Step 3: Update the verification plan's path example**

Find (§6):

```
- View source (not devtools-rendered DOM) on a real experience page and a real host page in dev, confirm the `<title>`, `<meta description>`, canonical `<link>`, and `<script type="application/ld+json">` all reflect that specific listing/host, not the homepage defaults.
```

This line doesn't name a literal path, so leave it as-is — just confirm while reading through that no other line in §6 hardcodes `/hosts/`. (There isn't one as of this writing; if a later edit to that spec adds one, update it to `/experts/[slug]` too.)

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-08-10-seo-improvements-design.md
git commit -m "$(cat <<'EOF'
docs: update SEO spec for /experts/[slug] URL change

The SEO spec predates the slug URL migration and still described
canonical/sitemap/JSON-LD work against /hosts/[hostId]. Updated so
whoever implements it later builds against the current URL shape.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Full build and click-through verification

**Files:** none (verification only).

- [ ] **Step 1: Full type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 2: Confirm the migration's manual-application status is clearly communicated**

Re-read Task 1's completion report. Confirm it unambiguously states that `supabase/migrations/20260906_023_host_profiles_slug.sql` has NOT been applied to any database yet, matching how the currency-defaults migration was flagged in an earlier phase. Nothing in this feature works against a real database until that migration runs.

- [ ] **Step 3: Full manual click-through (requires the migration applied to your dev database)**

With the dev server running:
1. Visit `/experts` — every card's link goes to `/experts/<slug>`.
2. Click through to one detail page — it renders the same content the old `/hosts/<uuid>` page did.
3. Visit that same host's old `/hosts/<uuid>` URL directly — it 308-redirects to `/experts/<slug>`.
4. Use the homepage hero search bar to find an expert by name — the suggestion link goes to `/experts/<slug>`.
5. Open a published experience's detail page — the "View expert profile" link goes to `/experts/<slug>`.
6. Visit `/experts/this-slug-does-not-exist` — the "Expert not found" state renders, no crash.

Report any issue found. If it's a small, unambiguous fix, make it and commit separately with a descriptive message. If it's ambiguous or depends on the migration's not being applied yet, report it clearly instead of guessing.
