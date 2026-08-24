# Phase 1: Homepage + Experiences Page + Site-Wide Trust/Pricing Bugs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 🔴 "fix now" items from the Gozuru Platform Review (Samuel Njogu, reviewed against the live build 2026-08-09) — the Homepage and Experiences page, plus the pricing/fabricated-stats bugs that recur across the site.

**Architecture:** This is a Next.js 16 / React 19 App Router site (`app/(landing)`) backed by Supabase, with no build-time content layer — all "real" data comes through server components calling `fetchLandingExperiencesServer` / `fetchLandingExpertsServer`. Every fix in this plan either (a) edits copy/JSX in an existing component, (b) swaps a mock-data component for an already-built real-data component, or (c) removes fabricated content. No new pages, no schema changes, no new dependencies.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Supabase, `@base-ui/react`, `class-variance-authority`, `lucide-react`, `framer-motion`.

## Global Constraints

- No test framework exists in this repo (confirmed: no Jest/Vitest/Playwright, no `.test.ts` files, no test script in `package.json`). Per explicit user decision, this plan uses **manual/build verification only** — every task's "test" step is `npx tsc --noEmit` (or `npm run build` where noted) plus an exact manual dev-server click-through. Do not introduce a test framework as part of this plan.
- Currency is being locked to **KES only** across the platform (matches the existing `LANDING_CURRENCY = "KES"` constant in `lib/currency.ts:1`). Do not add multi-currency conversion logic.
- Do not delete unused-but-still-present components (`NewPropertiesSection.tsx`, `PropertyCard.tsx`, `lib/properties.ts`, `InvestmentSection.tsx`, `InvestmentStatCard.tsx`, `lib/investments.ts`'s `PLATFORM_STATS`) — they become unused by this plan but are left in place in case they're repurposed later. Only remove their *usage* from live pages.
- No real host/guest photography exists in this repo — every image swap in this plan uses the best-fitting existing Pexels/Unsplash URL already present somewhere in the codebase, not a new external image search.
- Follow existing conventions: Tailwind utility classes only (no CSS modules/styled-components), `cn()` from `@/lib/utils` for conditional classes, named exports for components.

---

### Task 1: Shared category badge styling module

**Files:**
- Create: `lib/category-styles.ts`
- Modify: `app/(landing)/components/sections/AgentCard.tsx:1-17`
- Modify: `app/(landing)/components/sections/ExperienceCard.tsx:1-8,66-74`
- Test: manual (no test framework — see Global Constraints)

**Interfaces:**
- Produces: `categoryBadgeClass(category: string): string` — exported from `lib/category-styles.ts`. Used by Task 1's own edits to `AgentCard.tsx` and `ExperienceCard.tsx`; no other task depends on this.

Three components currently define their own category→color mapping independently, with different matching strategies (`AgentCard.tsx` and `PropertyCard.tsx` do exact string match on different color sets; `ExperienceCard.tsx` does substring match). Consolidate into one shared, substring-matching helper (substring is the safer strategy since category strings from Supabase aren't guaranteed to exactly match a fixed literal set). `PropertyCard.tsx` is NOT touched — it's only used by `NewPropertiesSection`, which Task 6 removes from the live homepage, so editing it would be touching soon-dead code.

- [ ] **Step 1: Create the shared category styles module**

Create `lib/category-styles.ts`:

```ts
export function categoryBadgeClass(category: string): string {
  const normalized = category.toLowerCase();
  if (normalized.includes("hotel")) return "bg-blue-600/90";
  if (normalized.includes("meetup")) return "bg-orange-600/90";
  if (normalized.includes("social")) return "bg-purple-600/90";
  if (normalized.includes("expo")) return "bg-emerald-600/90";
  if (normalized.includes("expert") || normalized.includes("culture")) return "bg-rose-600/90";
  return "bg-orange-600/90";
}
```

- [ ] **Step 2: Update `ExperienceCard.tsx` to use the shared helper**

In `app/(landing)/components/sections/ExperienceCard.tsx`, remove the local `categoryBadgeClass` function (lines 66-74) and its now-unused nothing-else-imports, and import the shared one instead.

Change the import block at the top of the file (currently lines 1-9):

```tsx
"use client";

import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import type { ExperienceMediaItem } from "@/lib/experience-media";
import { cn } from "@/lib/utils";
import { formatDisplayMoney } from "@/lib/currency";
import { PropertyCTAButton } from "./PropertyCTAButton";
```

to:

```tsx
"use client";

import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import { ExperienceMediaDisplay } from "@/components/experience/ExperienceMediaDisplay";
import type { ExperienceMediaItem } from "@/lib/experience-media";
import { cn } from "@/lib/utils";
import { formatDisplayMoney } from "@/lib/currency";
import { categoryBadgeClass } from "@/lib/category-styles";
import { PropertyCTAButton } from "./PropertyCTAButton";
```

Then delete the local function definition (lines 66-74):

```tsx
function categoryBadgeClass(category: string): string {
  const normalized = category.toLowerCase();
  if (normalized.includes("hotel")) return "bg-blue-600/90";
  if (normalized.includes("meetup")) return "bg-orange-600/90";
  if (normalized.includes("social")) return "bg-purple-600/90";
  if (normalized.includes("expo")) return "bg-emerald-600/90";
  if (normalized.includes("expert") || normalized.includes("culture")) return "bg-rose-600/90";
  return "bg-orange-600/90";
}
```

(Every call site, e.g. `categoryBadgeClass(experience.category)` at line 113, stays unchanged — it now resolves to the imported function.)

- [ ] **Step 3: Update `AgentCard.tsx` to use the shared helper**

In `app/(landing)/components/sections/AgentCard.tsx`, replace lines 1-17:

```tsx
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { type LocalExpert } from "@/app/(landing)/lib/agents";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES: Record<string, string> = {
  "Hotel visit": "bg-blue-600/90 text-white",
  Meetup: "bg-orange-600/90 text-white",
  "Social event": "bg-purple-600/90 text-white",
  Expo: "bg-emerald-600/90 text-white",
  "Expert session": "bg-rose-600/90 text-white",
};

function categoryStyle(category: string) {
  return CATEGORY_STYLES[category] ?? "bg-foreground/80 text-background";
}
```

with:

```tsx
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { type LocalExpert } from "@/app/(landing)/lib/agents";
import { categoryBadgeClass } from "@/lib/category-styles";
import { cn } from "@/lib/utils";

function categoryStyle(category: string) {
  return `${categoryBadgeClass(category)} text-white`;
}
```

(This keeps the `categoryStyle(agent.category)` call at line 58 working unchanged, now backed by the shared substring-matching logic instead of the old exact-match table.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (pre-existing errors, if any, are unrelated to this change — confirm the count doesn't increase).

- [ ] **Step 5: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/` and `http://localhost:3000/experiences`. Confirm category badges (HOTEL VISIT, MEETUP, EXPO, EXPERT SESSION, SOCIAL EVENT) still render with a colored pill in the top-left of expert cards and experience cards, same visual colors as before.

- [ ] **Step 6: Commit**

```bash
git add lib/category-styles.ts "app/(landing)/components/sections/AgentCard.tsx" "app/(landing)/components/sections/ExperienceCard.tsx"
git commit -m "refactor: consolidate category badge styling into a shared module"
```

---

### Task 2: Redesign `PropertyCTAButton` — rounded corners, soft shadow

**Files:**
- Modify: `app/(landing)/components/sections/PropertyCTAButton.tsx`
- Test: manual

**Interfaces:**
- Consumes: nothing new.
- Produces: same `PropertyCTAButton` props/API (`href`, `children`, `variant`, `className`) — unchanged signature, only the rendered styling changes. Tasks 6 and 11 render this component; no prop changes required from them.

The review flags this button twice by description ("eliminate the black border and highlighted suffix arrow, can read as a form") — it's the hard offset-black-shadow, square-cornered button used for every "Book experience" / "Browse all experiences" / "See all experiences" CTA across expert cards, experience cards, and section footers.

- [ ] **Step 1: Replace the component styling**

Replace the full contents of `app/(landing)/components/sections/PropertyCTAButton.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PropertyCTAButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "card";
  className?: string;
};

export function PropertyCTAButton({
  href,
  children,
  variant = "primary",
  className,
}: PropertyCTAButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative inline-flex items-stretch overflow-hidden rounded-full transition-shadow duration-300",
        variant === "primary" &&
          "shadow-sm hover:shadow-md",
        variant === "outline" &&
          "border border-foreground/20 shadow-sm hover:border-foreground/35 hover:shadow-md",
        variant === "card" &&
          "w-full rounded-xl border border-foreground/15 bg-muted/20 hover:border-foreground/30 hover:bg-muted/40 dark:bg-muted/10",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center px-5 text-sm font-semibold tracking-wide transition-colors",
          variant === "primary" && "flex-1 bg-foreground text-background",
          variant === "outline" &&
            "flex-1 bg-background text-foreground group-hover:bg-foreground group-hover:text-background",
          variant === "card" && "flex-1 py-2.5 text-foreground",
        )}
      >
        {children}
      </span>

      <span
        className={cn(
          "flex items-center justify-center transition-all duration-300 ease-out",
          variant === "primary" &&
            "w-11 rounded-r-full bg-orange-400 text-white group-hover:w-14",
          variant === "outline" &&
            "w-11 rounded-r-full bg-orange-400 text-white group-hover:w-14",
          variant === "card" &&
            "w-10 rounded-r-xl bg-orange-400 text-white group-hover:w-12",
        )}
        aria-hidden
      >
        <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
```

Key changes from the original: `rounded-full` (was implicitly square, no rounding class at all) on the primary/outline variants and `rounded-xl` on the card variant (matching the existing rounded-xl convention used by `ExperienceCard`'s image), the hard `shadow-[4px_4px_0_0_rgba(0,0,0,0.9)]` offset-box-shadow is replaced with a conventional `shadow-sm`/`shadow-md`, and the `border-2 border-foreground` on the outline variant is softened to `border border-foreground/20`. The orange arrow accent chip is kept (that part of the design reads fine per the review — it's the black hard-shadow box specifically that was flagged).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Visit `http://localhost:3000/experiences` — every "Book experience" button on an experience card should now be a rounded pill/rounded-rect with a soft shadow, not a squared button with a hard black offset shadow. Hover over one and confirm the orange arrow chip still expands smoothly.

- [ ] **Step 4: Commit**

```bash
git add "app/(landing)/components/sections/PropertyCTAButton.tsx"
git commit -m "style: redesign PropertyCTAButton with rounded corners and soft shadow"
```

---

### Task 3: Lock host listing currency to KES

**Files:**
- Modify: `app/account/experiences/create/page.tsx:164,181,1099,1155,1654-1669,1721-1734`
- Test: manual

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks (this is the code-level half of the currency bug fix; Task 4 is the separate data-audit half).

**Root cause (confirmed):** this form lets a host pick USD/EUR/GBP/CAD/KES for both the experience's default price and any per-slot price override, but every public page always displays a raw "Ksh" prefix regardless of the stored currency (`lib/currency.ts:20-26`) — so a $85 listing shows publicly as "Ksh 85". Fix: remove the ability to choose anything other than KES going forward. Existing rows with a non-KES currency are NOT silently reinterpreted here — see Task 4.

- [ ] **Step 1: Default new listings to KES**

In `app/account/experiences/create/page.tsx`, change line 164:

```tsx
const [currency, setCurrency] = useState("USD");
```
to:
```tsx
const [currency, setCurrency] = useState("KES");
```

And line 181:
```tsx
const [slotCurrency, setSlotCurrency] = useState("USD");
```
to:
```tsx
const [slotCurrency, setSlotCurrency] = useState("KES");
```

- [ ] **Step 2: Fix the edit-mode hydration fallback**

When editing an existing experience, these two lines currently fall back to `"USD"` if the stored currency is somehow null — change the fallback to `"KES"` for consistency (this only changes behavior for the null-currency edge case; any experience with a real stored currency value, including legacy non-KES rows, still hydrates that real value truthfully).

Line 1099:
```tsx
setCurrency(experience.currency ?? "USD");
```
to:
```tsx
setCurrency(experience.currency ?? "KES");
```

Line 1155:
```tsx
setSlotCurrency(experience.currency ?? "USD");
```
to:
```tsx
setSlotCurrency(experience.currency ?? "KES");
```

(Line 1126, `currency: String(slot.currency ?? experience.currency ?? "USD"),` inside the availability-slot mapping, is left as-is — it's populating a per-slot form-state field from real historical data, same reasoning as above; changing the final fallback there too is harmless but not load-bearing. For consistency, change it as well: `currency: String(slot.currency ?? experience.currency ?? "KES"),`)

- [ ] **Step 3: Replace the "Currency" select (experience default) with a read-only field**

In `app/account/experiences/create/page.tsx`, replace lines 1653-1669:

```tsx
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Currency</label>
                        <select
                          value={currency}
                          onChange={(e) => {
                            setCurrency(e.target.value);
                            setSlotCurrency(e.target.value);
                          }}
                          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="CAD">CAD</option>
                          <option value="KES">KES</option>
                        </select>
                      </div>
```

with:

```tsx
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Currency</label>
                        <div className="flex h-10 w-full items-center rounded-xl border border-input bg-muted/30 px-3 text-sm text-foreground">
                          {currency}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Gozuru currently prices all listings in Kenyan Shillings.
                        </p>
                      </div>
```

(`currency` state now always reads "KES" for a new listing per Step 1; for an existing legacy non-KES listing being edited, this now-read-only field truthfully displays whatever is actually stored, e.g. "USD", rather than letting the host silently change it.)

- [ ] **Step 4: Replace the per-slot "Currency" override select with a read-only field**

Replace lines 1721-1734:

```tsx
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Currency</label>
                        <select
                          value={slotCurrency}
                          onChange={(e) => setSlotCurrency(e.target.value)}
                          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="CAD">CAD</option>
                          <option value="KES">KES</option>
                        </select>
                      </div>
```

with:

```tsx
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground">Currency</label>
                        <div className="flex h-10 w-full items-center rounded-xl border border-input bg-muted/30 px-3 text-sm text-foreground">
                          {slotCurrency}
                        </div>
                      </div>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. (`setSlotCurrency`/`setCurrency` are still used elsewhere in the file per the earlier grep — lines 642, 750, 916 — so removing the two `<select>` elements must not leave either setter unused; confirm no "declared but never used" warnings appear for `setCurrency`/`setSlotCurrency`.)

- [ ] **Step 6: Manual verification**

Run `npm run dev`, sign in as a host, go to `http://localhost:3000/account/experiences/create`, advance to the "Set your availability" step (step 4 of the wizard). Confirm both "Currency" fields now show a static "KES" (not a dropdown), and the "Estimated full-group value: KES ..." line still computes correctly. If an existing test host account has a previously-created experience with a non-KES currency, open it in edit mode and confirm the currency field displays that real stored value (not silently forced to "KES").

- [ ] **Step 7: Commit**

```bash
git add "app/account/experiences/create/page.tsx"
git commit -m "fix: lock host listing currency to KES, closing the Ksh-mislabeling bug"
```

---

### Task 4: Audit existing non-KES experiences (data check, not a code change)

**Files:**
- Create: `scripts/audit-non-kes-experiences.sql`
- Test: N/A (read-only SQL, run manually against Supabase)

**Interfaces:** none — standalone.

Task 3 stops new non-KES listings from being created, but doesn't touch rows that already exist with a non-KES currency (e.g. the review's "Ksh 3 vs Ksh 85" listings, if they're real DB rows rather than sample/mock data). Per the design decision, these are surfaced for a manual data decision, not silently reinterpreted by code.

- [ ] **Step 1: Write the audit query**

Create `scripts/audit-non-kes-experiences.sql`:

```sql
-- Audit: find published experiences priced in a currency other than KES.
--
-- Context: the host listing form previously allowed USD/EUR/GBP/CAD/KES,
-- but every public page always displays a raw "Ksh" prefix regardless of
-- the stored currency — producing misleading prices (e.g. a $85 listing
-- shown publicly as "Ksh 85"). The form now only creates KES listings
-- (see docs/superpowers/plans/2026-08-09-phase1-homepage-experiences.md,
-- Task 3). This query finds any pre-existing rows that still need a
-- manual decision (re-price in KES, or mark as draft until fixed).
--
-- Usage: Supabase Dashboard → SQL Editor → paste and run.

select
  e.id,
  e.title,
  e.status,
  e.price_amount,
  e.currency,
  e.host_user_id,
  e.created_at
from public.experiences e
where e.currency is distinct from 'KES'
order by e.created_at desc;

-- Same check on per-slot price overrides, if any exist:
select
  a.id as availability_id,
  a.experience_id,
  e.title,
  a.price_amount,
  a.currency,
  a.starts_at
from public.experience_availability a
join public.experiences e on e.id = a.experience_id
where a.currency is distinct from 'KES'
order by a.starts_at desc;
```

- [ ] **Step 2: Run it and report results**

Run this against the project's Supabase instance (Dashboard → SQL Editor, or via `psql "$DATABASE_URL" -f scripts/audit-non-kes-experiences.sql` if `DATABASE_URL` is populated in `.env.local`). Report the row count and a summary (which experiences, which currencies, real listings vs. obvious test/seed data) back to the user — this is a data decision for them, not something to auto-fix.

- [ ] **Step 3: Commit**

```bash
git add scripts/audit-non-kes-experiences.sql
git commit -m "chore: add audit script for pre-existing non-KES experience pricing"
```

---

### Task 5: Remove fabricated "Gozuru by the numbers" section from the homepage

**Files:**
- Modify: `app/(landing)/page.tsx:1-54`
- Test: manual

**Interfaces:** none.

`InvestmentSection` renders `PLATFORM_STATS` (97% positive feedback, 4.9 satisfaction, 68% repeat bookings, with fake sparkline series) plus a duplicate "Upcoming meetups & expos" fabricated-stats block — this is the exact destination of the review's flagged "See our metrics" link and reads as investor-pitch content on a consumer page. Per user decision, remove it from the live homepage entirely (component and data files stay in the repo, unused, per Global Constraints).

- [ ] **Step 1: Remove the import and usage**

In `app/(landing)/page.tsx`, remove `InvestmentSection` from the import block (currently lines 2-10):

```tsx
import {
  ContactTeamSection,
  ExpertAgentsSection,
  FeaturedExperiences,
  HowItWorksSection,
  InvestmentSection,
  NewPropertiesSection,
  TestimonialsSection,
} from "./components/sections";
```
to:
```tsx
import {
  ContactTeamSection,
  ExpertAgentsSection,
  HowItWorksSection,
  NewPropertiesSection,
  TestimonialsSection,
} from "./components/sections";
```

(Note: `FeaturedExperiences` is also removed from this import line here since Task 6 re-adds it in its own edit — if Task 6 hasn't run yet, keep `FeaturedExperiences` out of the import for now; Task 6 will add it back. Do not leave an unused import.)

And remove the `<InvestmentSection />` render call (currently line 49):

```tsx
      <NewPropertiesSection />
      <HowItWorksSection />
      <InvestmentSection />
      <TestimonialsSection />
      <ContactTeamSection />
```
to:
```tsx
      <NewPropertiesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <ContactTeamSection />
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/`. Confirm the orange "Gozuru by the numbers" band (with the sparkline stat cards and "Upcoming meetups & expos" sub-section) no longer appears anywhere on the page.

- [ ] **Step 4: Commit**

```bash
git add "app/(landing)/page.tsx"
git commit -m "fix: remove fabricated platform-metrics section from public homepage"
```

---

### Task 6: Swap fictional "Featured experiences" for the real, already-built component

**Files:**
- Modify: `app/(landing)/page.tsx`
- Test: manual

**Interfaces:** none.

`FeaturedExperiences.tsx` is already fully built against real Supabase data (via `initialData`, already being fetched in `page.tsx` as `featuredLandingData` but currently passed to nothing), including an honest empty state. `NewPropertiesSection` currently occupies its slot on the homepage instead, rendering 6 entirely fictional listings (fake hosts, fake prices) from `lib/properties.ts`. Swap back.

- [ ] **Step 1: Restore the `FeaturedExperiences` import**

In `app/(landing)/page.tsx`, update the import block (post-Task-5 state):

```tsx
import {
  ContactTeamSection,
  ExpertAgentsSection,
  HowItWorksSection,
  NewPropertiesSection,
  TestimonialsSection,
} from "./components/sections";
```
to:
```tsx
import {
  ContactTeamSection,
  ExpertAgentsSection,
  FeaturedExperiences,
  HowItWorksSection,
  TestimonialsSection,
} from "./components/sections";
```

- [ ] **Step 2: Swap the render call**

Replace:
```tsx
      <LandingHero initialData={sharedLandingData} />
      {/* <FeaturedExperiences initialData={featuredLandingData} /> */}
      <ExpertAgentsSection experts={experts} />

      <NewPropertiesSection />
      <HowItWorksSection />
```
with:
```tsx
      <LandingHero initialData={sharedLandingData} />
      <ExpertAgentsSection experts={experts} />

      <FeaturedExperiences initialData={featuredLandingData} />
      <HowItWorksSection />
```

(`featuredLandingData` is already fetched on line 37 of the existing file — `fetchLandingExperiencesServer(6, featuredImageTransform)` — no data-fetching change needed. `NewPropertiesSection` becomes unused in this file; its import is already removed by this edit.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors, no unused-import warnings.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/`. Confirm the "Featured experiences" section now shows real, currently-published Gozuru experiences (or the honest "No featured experiences yet — check back soon as hosts publish new experiences" empty state if fewer than 6 exist) — not "Four Seasons Insider Tour", "Curators' Rooftop Meetup", or any of the other fictional listings from `lib/properties.ts`.

- [ ] **Step 5: Commit**

```bash
git add "app/(landing)/page.tsx"
git commit -m "fix: replace fictional Featured Experiences section with real Supabase-backed data"
```

---

### Task 7: Homepage hero rework

**Files:**
- Modify: `app/(landing)/components/HeroLanding.tsx`
- Test: manual

**Interfaces:**
- Consumes: `pickExperienceCategory` from `@/lib/queries/experiences` (already exported, used elsewhere — `lib/queries/experiences.ts:27-33`).
- Produces: interest-chip links of the form `/experiences?category=<slug>` — Task 13 makes `ExperiencesGrid` read this query param and pre-filter.

Covers: eyebrow/subhead copy, two-part search+city pill, 4 real-category interest chips, secondary "Start hosting" link, dropping the meaningless 5-image auto-rotating carousel (and its dot indicators) in favor of one static background image, per the review's own guidance ("drop the dots if the hero doesn't actually rotate meaningfully").

- [ ] **Step 1: Replace the full component**

Replace the full contents of `app/(landing)/components/HeroLanding.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Navbar } from "@/app/(landing)/components/Navbar";
import {
  pickExperienceCategory,
  type LandingExperiencesResult,
} from "@/lib/queries/experiences";

const HERO_BACKGROUND_IMAGE =
  "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg";

export function LandingHero({ initialData }: { initialData: LandingExperiencesResult }) {
  const [searchValue, setSearchValue] = useState("");
  const [cityValue, setCityValue] = useState("Nairobi");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const { theme, resolvedTheme } = useTheme();
  const router = useRouter();

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";
  const normalizedQuery = searchValue.trim().toLowerCase();

  const suggestions = useMemo(() => {
    const experiences = initialData.experiences;
    const locationByExperienceId = initialData.locationByExperienceId;
    if (!normalizedQuery) return [];

    return experiences
      .filter((exp) => {
        const location = locationByExperienceId[exp.id] || exp.meeting_point_name || "";
        const description = exp.description || "";
        return `${exp.title} ${location} ${description}`.toLowerCase().includes(normalizedQuery);
      })
      .slice(0, 6)
      .map((exp) => ({
        id: exp.id,
        title: exp.title,
        location: locationByExperienceId[exp.id] || exp.meeting_point_name || "Location shared after booking",
      }));
  }, [initialData.experiences, initialData.locationByExperienceId, normalizedQuery]);

  const interestCategories = useMemo(() => {
    const seen = new Map<string, { name: string; slug: string }>();
    for (const exp of initialData.experiences) {
      const category = pickExperienceCategory(exp.categories);
      if (category && !seen.has(category.slug)) {
        seen.set(category.slug, category);
      }
      if (seen.size >= 4) break;
    }
    return Array.from(seen.values());
  }, [initialData.experiences]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchContainerRef.current) return;
      const target = event.target as Node;
      if (!searchContainerRef.current.contains(target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function goToExperiences() {
    const params = new URLSearchParams();
    if (searchValue.trim()) params.set("query", searchValue.trim());
    if (cityValue.trim()) params.set("city", cityValue.trim());
    if (!params.toString()) return;
    router.push(`/experiences?${params.toString()}`);
    setShowSuggestions(false);
  }

  return (
    <section
      className={`relative flex min-h-[80vh] items-center justify-center overflow-hidden transition-colors ${
        isDark ? "bg-zinc-900 text-white" : "bg-slate-950 text-white"
      }`}
    >
      <Navbar />

      <div className="absolute inset-0 -z-0">
        <Image
          src={HERO_BACKGROUND_IMAGE}
          alt="Travelers enjoying a Gozuru experience together"
          fill
          priority
          className="pointer-events-none object-cover"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-b transition-colors ${
            isDark
              ? "from-black/90 via-black/65 to-black/90"
              : "from-black/85 via-slate-950/50 to-black/85"
          }`}
        />
      </div>

      <div className="relative z-10 mx-auto flex lg:w-[1040px] flex-col items-center gap-6 px-4 pt-20 text-center md:items-start md:text-left">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur transition-colors ${
            isDark
              ? "bg-white/10 text-white"
              : "bg-white/15 text-white ring-1 ring-white/20"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Nairobi · Real people, real conversations
        </div>

        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-white">
            Reward Your Curiosity with Gozuru
          </h1>
          <p
            className={`max-w-xl text-balance text-sm sm:text-base leading-relaxed transition-colors ${
              isDark ? "text-zinc-100/90" : "text-zinc-100"
            }`}
          >
            Real people, real conversations — not just sightseeing.
          </p>
        </div>

        <div ref={searchContainerRef} className="relative mt-2 w-full max-w-xl text-zinc-950 [color-scheme:light]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              goToExperiences();
            }}
            className="flex w-full items-stretch gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-left shadow-lg shadow-black/20 outline-none transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/40 hover:border-zinc-300"
          >
            <input
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="What are you curious about?"
              aria-label="Search experiences"
              className="min-w-0 flex-[65] rounded-full border-0 bg-white px-4 py-2 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(9_9_11)] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#fff_inset]"
            />
            <div className="w-px shrink-0 self-stretch bg-zinc-200" aria-hidden />
            <input
              value={cityValue}
              onChange={(event) => setCityValue(event.target.value)}
              placeholder="City"
              aria-label="City"
              className="min-w-0 flex-[35] rounded-full border-0 bg-white px-3 py-2 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-orange-500/80 bg-orange-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-orange-700 sm:text-sm"
            >
              Explore
            </button>
          </form>

          {showSuggestions && normalizedQuery && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-xl">
              {suggestions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-zinc-600">
                  No matching experiences yet — try a city or topic.
                </p>
              ) : (
                <ul className="py-1">
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <Link
                        href={`/experiences/${suggestion.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="block px-4 py-2.5 transition hover:bg-zinc-100"
                      >
                        <p className="text-sm font-semibold text-zinc-950">
                          {suggestion.title}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {suggestion.location}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {interestCategories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {interestCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/experiences?category=${encodeURIComponent(category.slug)}`}
                className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:border-white/40 hover:bg-white/20"
              >
                {category.name}
              </Link>
            ))}
          </div>
        ) : null}

        <Link
          href="/hosts"
          className={`text-xs font-medium underline-offset-4 transition hover:underline ${
            isDark ? "text-white/70 hover:text-white" : "text-white/80 hover:text-white"
          }`}
        >
          Are you the expert? Start hosting →
        </Link>
      </div>
    </section>
  );
}
```

Notable changes from the original: the 5-image `HERO_IMAGES` rotation array, the `index` state, the rotation `useEffect`/`setInterval`, and the dot-indicator buttons are all removed in favor of one static `HERO_BACKGROUND_IMAGE`. The single search input becomes a two-field form (curiosity + city) with a divider, submitting both as query params. A new `interestCategories` memo derives up to 4 real, currently-published category chips from `initialData` (no hardcoded/fabricated category names — if fewer than 4 distinct categories exist in the data, fewer chips render, and if zero exist, the chip row doesn't render at all). A "Are you the expert? Start hosting →" link is added below the chips.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/`. Confirm:
- Eyebrow reads "Nairobi · Real people, real conversations", subhead reads "Real people, real conversations — not just sightseeing."
- The search bar is one pill containing two fields (curiosity text + city, pre-filled "Nairobi") separated by a vertical divider, with an "Explore" button.
- Typing in the left field still shows the live suggestions dropdown as before.
- Submitting navigates to `/experiences?query=...&city=...` with both values present.
- Below the search bar, up to 4 category chips render (skip this check if there are zero published experiences with categories in the dev database) — clicking one navigates to `/experiences?category=<slug>` (full pre-filtering isn't wired until Task 13 — confirm the URL is correct, filtering behavior is verified in Task 13).
- "Are you the expert? Start hosting →" links to `/hosts`.
- The background is one static image with no rotating dots underneath the chips/link.

- [ ] **Step 4: Commit**

```bash
git add "app/(landing)/components/HeroLanding.tsx"
git commit -m "feat: rework homepage hero — two-part search, interest chips, drop meaningless carousel"
```

---

### Task 8: Expert cards — honest trust copy + Verified badge tooltip

**Files:**
- Modify: `app/(landing)/components/sections/ExpertAgentsSection.tsx:34-37`
- Modify: `app/(landing)/components/sections/AgentCard.tsx`
- Test: manual

**Interfaces:** none.

Confirmed during design (see plan header note / prior research): `AgentCard` does not render a bio at all today, so the review's "truncated bio" complaint doesn't reproduce, and the card's `agent.title` field (from `mapHostToLocalExpert` in `lib/queries/experts.ts`) already serves as a real, data-driven one-line hook — no code change needed there. This task only covers the vague-trust-language subhead and the unexplained Verified badge.

- [ ] **Step 1: Replace the vague trust subhead**

In `app/(landing)/components/sections/ExpertAgentsSection.tsx`, replace lines 34-37:

```tsx
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Hotel curators, culture guides, event hosts, and community builders —
            each expert is rated by travelers and backed by Gozuru.
          </p>
```
with:
```tsx
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every host is vetted by our team and rated by the travelers who&apos;ve met them.
          </p>
```

- [ ] **Step 2: Add a hover/tap tooltip to the Verified badge**

In `app/(landing)/components/sections/AgentCard.tsx`, replace the Verified badge span (currently lines 64-67):

```tsx
          <span className="absolute right-3 top-3 z-[2] inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
            <BadgeCheck className="size-3 text-orange-300" aria-hidden />
            Verified
          </span>
```

with:

```tsx
          <span className="group/verified absolute right-3 top-3 z-[2]">
            <span
              tabIndex={0}
              className="inline-flex cursor-default items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md"
            >
              <BadgeCheck className="size-3 text-orange-300" aria-hidden />
              Verified
            </span>
            <span
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full z-10 mt-1.5 w-44 origin-top-right scale-95 rounded-lg bg-black/90 px-2.5 py-2 text-[11px] font-normal leading-snug text-white opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 group-hover/verified:scale-100 group-hover/verified:opacity-100 group-focus-within/verified:scale-100 group-focus-within/verified:opacity-100"
            >
              ID verified + in-person vetted
            </span>
          </span>
```

(Uses a Tailwind named group — `group/verified` — scoped to just the badge, separate from the card's own outer `group` hover state used elsewhere in this file, so the two hover effects don't interfere. `tabIndex` + `focus-within` makes the tooltip reachable via keyboard, not just mouse hover.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/`. Confirm the "Meet the people behind the experiences" subhead now reads the concrete vetting/rating claim instead of "backed by Gozuru". Hover over a "Verified" badge on any expert card and confirm a small tooltip appears below it reading "ID verified + in-person vetted"; confirm it also appears when Tab-focusing the badge via keyboard.

- [ ] **Step 5: Commit**

```bash
git add "app/(landing)/components/sections/ExpertAgentsSection.tsx" "app/(landing)/components/sections/AgentCard.tsx"
git commit -m "fix: replace vague trust copy and add explanatory tooltip to Verified badge"
```

---

### Task 9: Fix "How Gozuru Works" step 1 copy and image mismatch

**Files:**
- Modify: `app/(landing)/lib/how-it-works.ts:12-19`
- Test: manual

**Interfaces:** none.

Step 1's title currently restates the brand tagline circularly ("Discover experiences that reward your curiosity") instead of explaining what discovery looks like, and its image (`pexels-photo-271624.jpeg`) is the same stock photo reused for the hero's old first carousel slide and the "Hotel Partner Welcome Series" event cover — swap to a distinct, unused image so it doesn't feel recycled.

- [ ] **Step 1: Update the step 1 entry**

In `app/(landing)/lib/how-it-works.ts`, replace lines 12-19:

```ts
  {
    id: "discover",
    navLabel: "Discover experiences",
    title: "Discover experiences that reward your curiosity",
    description:
      "Browse hotel partner visits, expert-led sessions, meetups, social dinners, and travel expos — curated for travelers who want more than a checklist.",
    image: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
    detailImage: "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg",
  },
```

with:

```ts
  {
    id: "discover",
    navLabel: "Discover experiences",
    title: "Browse by curiosity, city, or expert",
    description:
      "Find someone worth meeting — search by topic, tap an interest chip, or browse hosts directly. No generic checklist, just people worth talking to.",
    image: "https://images.pexels.com/photos/1319854/pexels-photo-1319854.jpeg",
    detailImage: "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg",
  },
```

(`detailImage` is left unchanged — only the `image` field, which is what visibly mismatched the step's copy, is swapped. The new image is a person browsing/searching on a laptop — matches "discover/browse" rather than a hotel-room interior.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (this is a data-only change, type shape unchanged).

- [ ] **Step 3: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/`, scroll to "How Gozuru Works". Confirm step 1's title now reads "Browse by curiosity, city, or expert" and its image is a browsing/search moment, not a hotel room. Click through all 4 steps (tap-to-jump) and confirm the auto-advance still works.

- [ ] **Step 4: Commit**

```bash
git add "app/(landing)/lib/how-it-works.ts"
git commit -m "fix: rewrite circular step-1 copy and swap its mismatched image"
```

---

### Task 10: Footer — add host-facing CTA line, standardize button label

**Files:**
- Modify: `app/(landing)/components/Footer.tsx:88-106`
- Test: manual

**Interfaces:** none.

- [ ] **Step 1: Add the host-facing line paired with its own button**

In `app/(landing)/components/Footer.tsx`, replace lines 88-106:

```tsx
            <p className="mt-6 max-w-xl text-lg leading-8 text-orange-50/90">
              Reward your curiosity with people-led experiences, practical local
              knowledge, and conversations that go deeper than a typical tour.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/experiences"
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-400"
              >
                Explore experiences
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/hosts"
                className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-orange-50 backdrop-blur transition hover:border-orange-300/50 hover:bg-white/15"
              >
                Become a host
              </Link>
            </div>
```

with:

```tsx
            <p className="mt-6 max-w-xl text-lg leading-8 text-orange-50/90">
              Reward your curiosity with people-led experiences, practical local
              knowledge, and conversations that go deeper than a typical tour.
            </p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <Link
                href="/experiences"
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-400"
              >
                Explore experiences
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <div className="flex items-center gap-3">
                <p className="text-sm text-orange-50/80">
                  Or turn what you know into someone else&apos;s best afternoon.
                </p>
                <Link
                  href="/hosts"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-orange-300/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-orange-50 backdrop-blur transition hover:border-orange-300/50 hover:bg-white/15"
                >
                  Start hosting
                </Link>
              </div>
            </div>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/` and scroll to the footer. Confirm the host-facing line "Or turn what you know into someone else's best afternoon." appears next to its own "Start hosting" button (not sharing the traveler-facing paragraph above it), and the button label reads "Start hosting" (not "Become a host").

- [ ] **Step 4: Commit**

```bash
git add "app/(landing)/components/Footer.tsx"
git commit -m "feat: pair host-facing CTA line with its own button in the footer"
```

---

### Task 11: Experiences page — de-fabricate and demote the events band

**Files:**
- Modify: `app/(landing)/lib/investments.ts:18-30,63-106`
- Modify: `app/(landing)/components/sections/InvestmentOfferCard.tsx:76-96`
- Modify: `app/(landing)/components/sections/UpcomingEventsSection.tsx`
- Modify: `app/(landing)/experiences/page.tsx:40-46`
- Test: manual

**Interfaces:** none — `FeaturedEvent` type change is fully contained (produced and consumed only within these files).

Per user decision: keep the events band merged with the experiences page (no full nav/route split — no real event data source exists yet), but strip the fabricated attendee/rating/satisfaction numbers, relabel the section, and move it below the real host-led grid so the real product carries the primary visual weight.

- [ ] **Step 1: Remove the fabricated fields from the `FeaturedEvent` type and data**

In `app/(landing)/lib/investments.ts`, replace the `FeaturedEvent` type (lines 18-30):

```ts
export type FeaturedEvent = {
  id: string;
  name: string;
  location: string;
  category: string;
  durationHours: number;
  maxAttendees: number;
  description: string;
  image: string;
  attendeeCount: number;
  rating: number;
  satisfactionPercent: number;
};
```
with:
```ts
export type FeaturedEvent = {
  id: string;
  name: string;
  location: string;
  category: string;
  durationHours: number;
  maxAttendees: number;
  description: string;
  image: string;
};
```

And remove the three fabricated fields from each entry in `FEATURED_EVENTS` (lines 63-106):

```ts
export const FEATURED_EVENTS: FeaturedEvent[] = [
  {
    id: "nairobi-travel-expo",
    name: "Nairobi Travel & Culture Expo",
    location: "Kenya/Nairobi/KICC",
    category: "Expo",
    durationHours: 6,
    maxAttendees: 500,
    description:
      "Meet Gozuru experts, hotel partners, and fellow travelers at East Africa's largest curiosity-driven travel gathering — keynotes, tastings, and live bookings.",
    image: "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg",
    attendeeCount: 480,
    rating: 4.9,
    satisfactionPercent: 98,
  },
  {
    id: "hotel-partner-series",
    name: "Hotel Partner Welcome Series",
    location: "Multiple cities worldwide",
    category: "Hotel visit",
    durationHours: 2,
    maxAttendees: 12,
    description:
      "Exclusive behind-the-scenes visits at partner hotels — meet the concierge team, explore signature spaces, and connect with a local Gozuru expert on arrival.",
    image: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
    attendeeCount: 2400,
    rating: 4.8,
    satisfactionPercent: 96,
  },
  {
    id: "curators-meetup",
    name: "Curators' Monthly Meetup",
    location: "Global · rotating cities",
    category: "Meetup",
    durationHours: 3,
    maxAttendees: 30,
    description:
      "A relaxed social evening where travelers swap stories, experts share insider tips, and the Gozuru community grows one conversation at a time.",
    image: "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg",
    attendeeCount: 860,
    rating: 5.0,
    satisfactionPercent: 99,
  },
];

export function formatAttendeeCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1).replace(/\.0$/, "")}k+`;
  }
  return `${count}+`;
}
```

with:

```ts
export const FEATURED_EVENTS: FeaturedEvent[] = [
  {
    id: "nairobi-travel-expo",
    name: "Nairobi Travel & Culture Expo",
    location: "Kenya/Nairobi/KICC",
    category: "Expo",
    durationHours: 6,
    maxAttendees: 500,
    description:
      "Meet Gozuru experts, hotel partners, and fellow travelers at East Africa's largest curiosity-driven travel gathering — keynotes, tastings, and live bookings.",
    image: "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg",
  },
  {
    id: "hotel-partner-series",
    name: "Hotel Partner Welcome Series",
    location: "Multiple cities worldwide",
    category: "Hotel visit",
    durationHours: 2,
    maxAttendees: 12,
    description:
      "Exclusive behind-the-scenes visits at partner hotels — meet the concierge team, explore signature spaces, and connect with a local Gozuru expert on arrival.",
    image: "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
  },
  {
    id: "curators-meetup",
    name: "Curators' Monthly Meetup",
    location: "Global · rotating cities",
    category: "Meetup",
    durationHours: 3,
    maxAttendees: 30,
    description:
      "A relaxed social evening where travelers swap stories, experts share insider tips, and the Gozuru community grows one conversation at a time.",
    image: "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg",
  },
];
```

(`formatAttendeeCount` is deleted entirely along with its only remaining call site, handled in Step 2.)

- [ ] **Step 2: Remove the fabricated stats block from the event card**

In `app/(landing)/components/sections/InvestmentOfferCard.tsx`, update the import block (currently lines 1-11):

```tsx
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Star, Users } from "lucide-react";
import {
  getSampleEventHref,
  getSampleEventTicketHref,
} from "@/app/(landing)/lib/sample-events";
import {
  formatAttendeeCount,
  type FeaturedEvent,
} from "@/app/(landing)/lib/investments";
```
to:
```tsx
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import {
  getSampleEventHref,
  getSampleEventTicketHref,
} from "@/app/(landing)/lib/sample-events";
import { type FeaturedEvent } from "@/app/(landing)/lib/investments";
```

(`Star` is no longer used once the rating block is removed below.)

Then replace the closing stats block (currently lines 76-96):

```tsx
      <div className="flex flex-row items-center justify-around gap-6 border-t border-border p-5 sm:p-6 lg:flex-col lg:justify-center lg:border-l lg:border-t-0 lg:px-8">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground sm:text-2xl">
            {formatAttendeeCount(offer.attendeeCount)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Attendees</p>
        </div>
        <div className="text-center">
          <p className="inline-flex items-center justify-center gap-1 text-xl font-bold text-foreground sm:text-2xl">
            <Star className="size-5 fill-orange-500 text-orange-500" aria-hidden />
            {offer.rating.toFixed(1)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Rating</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground sm:text-2xl">
            {offer.satisfactionPercent}%
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Satisfaction</p>
        </div>
      </div>
    </article>
  );
}
```

with:

```tsx
      <div className="flex flex-row items-center justify-center gap-6 border-t border-border p-5 sm:p-6 lg:flex-col lg:border-l lg:border-t-0 lg:px-8">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground sm:text-2xl">
            Up to {offer.maxAttendees}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Spots</p>
        </div>
      </div>
    </article>
  );
}
```

(Keeps one honest, already-real number — `maxAttendees`, the event's stated capacity — instead of the three fabricated ones. `Users` icon import stays in use via the "Up to {offer.maxAttendees} attendees" line elsewhere in the card body, lines 50-53, unchanged.)

- [ ] **Step 3: Rename the section and add distinguishing copy**

Replace the full contents of `app/(landing)/components/sections/UpcomingEventsSection.tsx`:

```tsx
import { FEATURED_EVENTS } from "@/app/(landing)/lib/investments";
import { InvestmentOfferCard } from "./InvestmentOfferCard";
import { Section } from "./Section";

export function UpcomingEventsSection() {
  return (
    <Section
      id="upcoming-events"
      className="bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600"
      containerClassName="max-w-7xl"
    >
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
          Meetups & expos
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
          Events & gatherings
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
          Meetups, expos, and welcome visits — different from a 1:1 session with a
          host. Browse those in the experiences grid above.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-6">
        {FEATURED_EVENTS.map((event) => (
          <InvestmentOfferCard key={event.id} offer={event} />
        ))}
      </div>
    </Section>
  );
}
```

(Heading changed from "Upcoming events" to "Events & gatherings"; sub-copy now explicitly distinguishes this from the host-led experiences grid, addressing the review's "visitor can't form one mental model of what booking here means" concern. The orange full-bleed background is intentionally kept for now — Step 4 handles demoting its visual dominance by reordering, not by removing the color treatment.)

- [ ] **Step 4: Reorder — real experiences grid first, events band second**

In `app/(landing)/experiences/page.tsx`, replace the render block (currently lines 40-45):

```tsx
      <ExperienceHero initialData={experiencesData} />
      <Suspense fallback={null}><UpcomingEventsSection /></Suspense>
      <Suspense fallback={null}><ExperiencesGrid initialData={experiencesData} /></Suspense>
      <Suspense fallback={null}><FeaturedExperiencesShowcase initialData={featuredData} /></Suspense>
```

with:

```tsx
      <ExperienceHero initialData={experiencesData} />
      <Suspense fallback={null}><ExperiencesGrid initialData={experiencesData} /></Suspense>
      <Suspense fallback={null}><UpcomingEventsSection /></Suspense>
      <Suspense fallback={null}><FeaturedExperiencesShowcase initialData={featuredData} /></Suspense>
```

(Only the order of the two `<Suspense>` lines changes — the real host-led grid now renders immediately after the hero, ahead of the events band, so the primary product gets top billing.)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors, no unused-import warnings (confirm `Star` is gone from `InvestmentOfferCard.tsx`'s import line and `formatAttendeeCount` has no remaining references anywhere — run `grep -rn "formatAttendeeCount" app lib` and confirm zero matches).

- [ ] **Step 6: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/experiences`. Confirm: the real "All experiences" grid now appears directly below the hero, before the orange events band; the orange band's heading now reads "Events & gatherings" with the new distinguishing sub-copy; each event card shows only "Up to N Spots" (no Attendees/Rating/Satisfaction numbers).

- [ ] **Step 7: Commit**

```bash
git add "app/(landing)/lib/investments.ts" "app/(landing)/components/sections/InvestmentOfferCard.tsx" "app/(landing)/components/sections/UpcomingEventsSection.tsx" "app/(landing)/experiences/page.tsx"
git commit -m "fix: strip fabricated event stats, relabel events band, prioritize real experiences grid"
```

---

### Task 12: Experiences page hero — align search bar with homepage

**Files:**
- Modify: `app/(landing)/components/HeroExperience copy.tsx`
- Test: manual

**Interfaces:** none — mirrors Task 7's search pattern but keeps this page's own headline/subhead (per design: "Explore unique experiences" already matches visitor intent for this page, no rewrite needed there).

- [ ] **Step 1: Replace the search bar with the two-part pill pattern, drop the carousel**

In `app/(landing)/components/HeroExperience copy.tsx`, replace lines 11-17 (the `HERO_IMAGES` array):

```tsx
const HERO_IMAGES = [
  "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg",
  "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg",
  "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg",
  "https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg",
  "https://images.pexels.com/photos/1267696/pexels-photo-1267696.jpeg",
];
```
with:
```tsx
const HERO_BACKGROUND_IMAGE =
  "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg";
```

Replace the component body's `index` state and rotation effect (lines 19-56 — the `useState(0)` for `index` and its `setInterval` effect) — remove:
```tsx
  const [index, setIndex] = useState(0);
```
and remove the entire rotation `useEffect` block:
```tsx
  useEffect(() => {
    const id = setInterval(
      () => setIndex((prev) => (prev + 1) % HERO_IMAGES.length),
      6000,
    );
    return () => clearInterval(id);
  }, []);
```

(Keep the `showSuggestions` outside-click `useEffect` that follows it — that one stays.)

Replace the image-rendering block (currently lines 77-93):

```tsx
      <div className="absolute inset-0 -z-0">
        {HERO_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={src}
              alt="People enjoying a Gozuru experience"
              fill
              priority={i === 0}
              className="pointer-events-none object-cover"
            />
          </div>
        ))}
```

with:

```tsx
      <div className="absolute inset-0 -z-0">
        <Image
          src={HERO_BACKGROUND_IMAGE}
          alt="People enjoying a Gozuru experience"
          fill
          priority
          className="pointer-events-none object-cover"
        />
```

Replace the search form's input (currently lines 127-137, the single search field) with a two-part pill matching Task 7's homepage pattern:

```tsx
            <input
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search by city, topic, or keyword"
              aria-label="Search experiences"
              className="flex-1 rounded-full border-0 bg-white px-4 py-2 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none"
            />
```

with:

```tsx
            <input
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="What are you curious about?"
              aria-label="Search experiences"
              className="min-w-0 flex-[65] rounded-full border-0 bg-white px-4 py-2 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none"
            />
            <div className="w-px shrink-0 self-stretch bg-zinc-200" aria-hidden />
            <input
              defaultValue="Nairobi"
              placeholder="City"
              aria-label="City"
              className="min-w-0 flex-[35] rounded-full border-0 bg-white px-3 py-2 text-sm font-medium text-zinc-950 caret-orange-600 placeholder:text-zinc-500 outline-none focus-visible:outline-none"
            />
```

(The city field here is presentational-only, matching Task 7's "no city-filtering backend yet" scope note — it doesn't feed the submit handler, since this page's search only ever needs `query`, it already lives on `/experiences`. Uses `defaultValue` rather than controlled state since nothing reads it.)

Remove the dot-indicator block at the bottom (currently lines 170-185):

```tsx
        <div
          className={`mt-2 lg:ml-5 p-1 rounded-full flex gap-1.5 transition-colors ${
            isDark ? "bg-black/30" : "bg-black/35"
          }`}
        >
          {HERO_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
```

Delete it entirely (no replacement needed).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors, no unused-variable warnings for `index`/`setIndex`/`HERO_IMAGES` (all removed).

- [ ] **Step 3: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/experiences`. Confirm the hero search bar now visually matches the homepage's two-part pill (curiosity + city with a divider), the background is a single static image with no rotating dots, and typing in the search field still shows live suggestions and still submits to `/experiences?query=...` on Enter/submit.

- [ ] **Step 4: Commit**

```bash
git add "app/(landing)/components/HeroExperience copy.tsx"
git commit -m "style: align experiences-page hero search bar and background with homepage"
```

---

### Task 13: Wire category deep-link into the experiences grid

**Files:**
- Modify: `app/(landing)/components/sections/ExperiencesSection.tsx:16-24`
- Test: manual

**Interfaces:**
- Consumes: `/experiences?category=<slug>` URL format produced by Task 7's homepage interest chips.
- Produces: nothing further downstream.

`ExperiencesGrid` already computes `categoryFilters` from real data and supports `activeFilter` as local component state, matching each category's `slug`, but it's never initialized from the URL — so a chip link from the homepage lands on the unfiltered "All" view instead of pre-filtered.

- [ ] **Step 1: Read `?category=` on mount**

In `app/(landing)/components/sections/ExperiencesSection.tsx`, replace lines 16-24:

```tsx
export function ExperiencesGrid({ initialData }: { initialData: LandingExperiencesResult }) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("query")?.trim().toLowerCase() ?? "";
  const [activeFilter, setActiveFilter] = useState<ExperienceFilter>("all");
  const [currentTimestamp, setCurrentTimestamp] = useState(0);

  const experiences = initialData.experiences;
  const coverByExperienceId = initialData.coverByExperienceId;
  const locationByExperienceId = initialData.locationByExperienceId;
```

with:

```tsx
export function ExperiencesGrid({ initialData }: { initialData: LandingExperiencesResult }) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("query")?.trim().toLowerCase() ?? "";
  const categoryParam = searchParams.get("category")?.trim() ?? "";
  const [activeFilter, setActiveFilter] = useState<ExperienceFilter>(categoryParam || "all");
  const [currentTimestamp, setCurrentTimestamp] = useState(0);

  const experiences = initialData.experiences;
  const coverByExperienceId = initialData.coverByExperienceId;
  const locationByExperienceId = initialData.locationByExperienceId;
```

(`activeFilter`'s type is already `ExperienceFilter = "all" | "latest" | string`, so initializing it from an arbitrary category slug string is already valid per the existing type — no type change needed. If `categoryParam` doesn't match any real category slug present in `categoryFilters`, the existing filter logic at the bottom of the file, `return exp.categorySlug === activeFilter;`, simply matches nothing, which correctly falls through to the existing "No experiences found — Try another filter or search term" empty state — no new empty-state handling required.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, visit `http://localhost:3000/` and click one of the homepage's interest chips. Confirm it navigates to `/experiences?category=<slug>` and the grid loads with that category's filter button already active/highlighted, showing only matching experiences. Then visit `http://localhost:3000/experiences` directly (no query params) and confirm "All" is still the default active filter.

- [ ] **Step 4: Commit**

```bash
git add "app/(landing)/components/sections/ExperiencesSection.tsx"
git commit -m "feat: pre-filter experiences grid from a category query param"
```

---

### Task 14: Full Phase 1 integration pass

**Files:** none modified — verification only.

**Interfaces:** none.

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: build succeeds with no type errors. (This also catches anything `tsc --noEmit` alone might miss, e.g. issues only surfaced during static generation of `app/(landing)/page.tsx` and `app/(landing)/experiences/page.tsx`, both server components fetching real data.)

- [ ] **Step 2: Full manual click-through**

Run `npm run dev` and walk through, in order:
1. `/` — hero copy, two-part search + city field, interest chips (click one → lands on `/experiences?category=...` pre-filtered), "Start hosting" link, single static background (no dots), expert cards with tooltip-bearing Verified badges, real "Featured experiences" section (no fictional listings), no "Gozuru by the numbers" band anywhere, footer with paired host CTA line + "Start hosting" button.
2. `/experiences` — matching two-part search hero, real experiences grid appears before the "Events & gatherings" band, event cards show no fabricated stats, category filter buttons work (including a URL with `?category=` pre-set).
3. Spot-check price display on a few real listing cards on both pages — confirm every price shows "Ksh N" with no currency mismatch (cross-reference against Task 4's audit results if any non-KES rows were found).
4. `/account/experiences/create` (as a host) — confirm the currency field is a static "KES" display, not a dropdown.

Report any visual issue found back before considering Phase 1 done — in particular, re-check the review's claimed "overlapping/bled text near the top of the orange events band" bug live now that the band has moved (Task 11); no source-level cause was found during design, so this needs an actual look.

- [ ] **Step 3: Final commit (if step 2 surfaced fixes)**

If manual verification in Step 2 required any small fixes, commit them individually with a descriptive message per fix rather than bundling into this task.
