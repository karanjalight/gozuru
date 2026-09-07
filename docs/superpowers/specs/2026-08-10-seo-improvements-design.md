# SEO Improvements — Design

Status: Approved. Ready for implementation planning.

## 1. Problem and current state

Gozuru has some SEO groundwork (`lib/seo.ts` default metadata, an Organization/WebSite JSON-LD block in `app/layout.tsx`, a generated OG image), but it has three gaps that together explain why search results currently look unorganized:

1. **No crawl map at all.** There is no `robots.txt` and no `sitemap.xml` anywhere in the repo (confirmed — no `app/robots.ts`, `app/sitemap.ts`, or static equivalents). Google has no reliable way to discover the real experience/host pages beyond following links.
2. **A sitewide canonical bug.** `lib/seo.ts`'s `defaultMetadata` sets `alternates.canonical` to the homepage URL. Next.js metadata is inherited from the root layout when a page doesn't declare its own `alternates`, and today almost none of them do — About, Contact, Terms, Chapatis, Experts, Hosts (Become a Host), Experiences (list), Sample Experiences (list), and both `sample-events`/`sample-experiences` dynamic detail pages all currently declare, via inheritance, "the canonical version of this page is the homepage." Worse, the two pages that matter most for organic discovery — `/experiences/[experienceId]` and `/experts/[slug]` — are `"use client"` components with **no page-specific metadata at all**, so every single real listing and every single host profile currently renders the exact same `<title>`, `<meta description>`, and canonical URL as the homepage. This is the direct cause of "search doesn't look organized": Google cannot currently tell any two experience or host pages apart.
3. **No structured data beyond the sitewide Organization/WebSite block.** Nothing describes an individual experience (price, location, rating) or a host (name, bio, rating) in a way Google can render as a rich result (star rating, price, breadcrumb trail).

Additionally, private/authenticated areas (`/account/**`, `/admin/**`, `/auth/**`) have no crawl or index directives, so nothing currently stops them from being crawled or indexed.

## 2. Scope

Full pass, in two phases:
- **Phase A** — crawlability foundation: `robots.ts`, `sitemap.ts`, the canonical fix, private-route disallow.
- **Phase B** — rich results: per-page metadata + JSON-LD for the two real dynamic page types (`/experiences/[experienceId]`, `/experts/[slug]`).

Non-goals (explicitly out of scope, see §7).

## 3. Phase A — Crawlability foundation

### 3.1 `app/robots.ts` (new)

Standard Next.js `MetadataRoute.Robots` file:
```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account/", "/admin/", "/auth/", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
```

### 3.2 `app/sitemap.ts` (new)

`MetadataRoute.Sitemap`, built server-side using the same anon-key `createClient` pattern already established in `lib/queries/experiences-server.ts` / `lib/queries/experts-server.ts` (new helper, e.g. `lib/queries/sitemap-server.ts`, to keep the query logic testable and out of the route file itself).

- **Static entries:** `/`, `/experiences`, `/experts`, `/hosts`, `/about`, `/contact`, `/terms`, `/chapatis`, `/sample-experiences`, plus the existing static slugs already enumerated by `SAMPLE_EXPERIENCE_SLUGS` and the sample-events equivalent.
- **Dynamic entries:**
  - Every `experiences` row where `status = 'published'` → `/experiences/[id]`, `lastModified` from the row's `updated_at` column.
  - Every host with at least one published experience — same "published host" rule already implemented in `fetchLandingExpertsServer` (`lib/queries/experts-server.ts`, the `publishedHostIds` derivation) — reused, not reimplemented, → `/experts/[slug]` (see [[2026-09-06-expert-slug-urls-design]] — `/hosts/[hostId]` is now a permanent-redirect stub, not the canonical page).
- Private/auth-gated routes are excluded entirely (redundant with §3.1's disallow, but sitemaps should never list disallowed URLs).
- `export const dynamic = "force-dynamic"` on the sitemap route, matching the existing convention used by the experiences/experts list pages rather than introducing a new caching strategy.

### 3.3 Canonical bug fix

- `lib/seo.ts`: remove `alternates: { canonical: siteUrl }` from `defaultMetadata`. No sitewide default canonical — each page is responsible for its own.
- Add an explicit `alternates: { canonical: "<path>" }` to the existing metadata block in each of: `app/(landing)/page.tsx` (`/`), `about/page.tsx` (`/about`), `contact/page.tsx` (`/contact`), `terms/page.tsx` (`/terms`), `chapatis/page.tsx` (`/chapatis`), `experts/page.tsx` (`/experts`), `hosts/page.tsx` (`/hosts`), `experiences/page.tsx` (`/experiences`), `sample-experiences/page.tsx` (`/sample-experiences`).
- Add `alternates.canonical` to the two existing `generateMetadata` functions (`sample-events/[slug]`, `sample-experiences/[slug]`), which currently return no `alternates` at all.
- Canonical paths are relative (`"/about"`); they resolve against `metadataBase`, which is already set correctly in `defaultMetadata`.

### 3.4 Private-route indexing

- `robots.txt` disallow (§3.1) is the primary control for `/account/**`, `/admin/**`, `/auth/**`.
- Additionally, `app/(admin)/admin/layout.tsx` is already a server component — add `export const metadata: Metadata = { robots: { index: false, follow: false } }` there as a free extra layer.
- `app/account/layout.tsx` and `app/auth/layout.tsx` are `"use client"` and cannot export `metadata`; not converting them to server components for this (would be an unrelated architecture change) — the `robots.txt` disallow is sufficient and is standard practice for authenticated app sections.

## 4. Phase B — Rich results for real Experience & Host pages

Both dynamic pages follow the same "light touch" pattern: the existing client component keeps 100% of its current logic and behavior, unchanged. A new thin server wrapper is added purely to produce metadata and structured data.

### 4.1 `/experiences/[experienceId]`

- Rename current `app/(landing)/experiences/[experienceId]/page.tsx` (unchanged content) to `ExperienceDetailClient.tsx` in the same folder.
- New `page.tsx` (server component):
  - `generateMetadata({ params })`: minimal server-side Supabase query for `title`, `subtitle`/`description`, `price_amount`, `currency`, cover image, city — returns `title`, `description`, Open Graph/Twitter fields, `alternates.canonical: /experiences/[id]`. Falls back to a generic "Experience not found – Gozuru" title if the row doesn't exist (mirrors the existing pattern in `sample-experiences/[slug]/page.tsx`).
  - Renders one `<script type="application/ld+json">` (built by `buildJsonLdExperience(...)`, see §4.3) followed by `<ExperienceDetailClient />`.
  - The client component still does its own full client-side fetch as it does today — this is a duplicate read (metadata query + client query), accepted as the cost of the light-touch approach; both queries are small, indexed lookups.

### 4.2 `/experts/[slug]`

- Same split: rename current `app/(landing)/experts/[slug]/page.tsx` content to `HostProfileClient.tsx`, add a server `page.tsx` with `generateMetadata` (host name, headline/bio, avatar, `alternates.canonical: /experts/[slug]`) and a JSON-LD `<script>` (built by `buildJsonLdHostProfile(...)`). `/hosts/[hostId]` (see [[2026-09-06-expert-slug-urls-design]]) stays a permanent-redirect stub and is excluded from the sitemap.

### 4.3 New JSON-LD builders in `lib/seo.ts`

- `buildJsonLdBreadcrumb(items: { name: string; url: string }[])` → `BreadcrumbList`. Used as: Home → Experiences → Title (experience page), Home → Experts → Name (host page).
- `buildJsonLdExperience({ id, title, description, imageUrl, priceAmount, currency, city, hasUpcomingSlot, avgRating, reviewCount })` → `Product` with a nested `Offer` (`price`, `priceCurrency` taken from the experience row's own `currency` column — not assumed — `availability: InStock | SoldOut` from `hasUpcomingSlot`, `url`) and, **only when `reviewCount > 0`**, a nested `AggregateRating` (`ratingValue: avgRating`, `reviewCount`).
- `buildJsonLdHostProfile({ id, name, headline, bio, imageUrl, avgRating, reviewCount })` → `ProfilePage` wrapping a `mainEntity` `Person` (`name`, `image`, `description`, `url`), with `AggregateRating` on the `Person` only when `reviewCount > 0`.

### 4.4 Real rating data — no fabrication

`lib/queries/experts.ts`'s `mapHostToLocalExpert` hardcodes `rating: 5, reviewCount: 0` (documented in [[project-gozuru-reviews-ratings-unimplemented]]) — this function and its output are **not** used anywhere in this feature. Instead:
- Experience page rating: a dedicated aggregate query — `select rating from reviews where experience_id = :id` — averaged and counted server-side over **all** matching rows (not the 6-row slice the client UI paginates on for display).
- Host page rating: `select rating from reviews where experience_id in (:published_experience_ids_for_this_host)`, averaged/counted the same way.
- If either query returns zero rows, `aggregateRating` is omitted from the JSON-LD entirely — never a placeholder value. This matches Google's structured-data guidelines (fabricated/unbacked ratings are a manual-action risk) and the project's existing stance against unbacked trust signals.

## 5. Explicitly not touched

- The existing client-side data-fetching logic in both detail pages (Supabase calls in `useEffect`, `useParams`, loading/not-found states) — unchanged, per the "light touch" decision.
- `lib/queries/experts.ts`'s fabricated rating stub and the wider Reviews & Ratings system gap — tracked separately in [[project-gozuru-reviews-ratings-unimplemented]], not this feature's job to fix.
- Duplicate-looking auth routes (`/auth/login` vs `/auth/client/login` vs `/auth/signup/client`, etc.) — all covered by the blanket `/auth/` robots disallow, so their overlap is not an SEO problem; not cleaned up here as it's unrelated to SEO.
- No `SearchAction` structured data on the `WebSite` JSON-LD — `/experiences` has no real query-param search today (confirmed: no `searchParams`/`useSearchParams` usage on that page), and the existing hero search bars are already known-decorative (per [[project-gozuru-ux-review-rollout]]). Adding `SearchAction` would describe a feature that doesn't exist.
- No dynamic per-experience/per-host OG image (`opengraph-image.tsx` route per dynamic segment) — the sitewide generated OG image stays as the fallback for these pages; a per-listing OG image is a reasonable future enhancement but adds meaningful scope (image generation with real photos/title overlay) beyond "fix the metadata gap."
- General on-page content/keyword work, alt-text audits, page-speed work — not identified as gaps; images already carry meaningful `alt` text throughout.

## 6. Verification plan

- `npm run build` succeeds (confirms `generateMetadata`/sitemap/robots compile and the client/server split doesn't break the existing pages).
- Manually hit `/sitemap.xml` and `/robots.txt` in dev and confirm: sitemap lists real published experience/host URLs and excludes account/admin/auth; robots.txt disallows the right prefixes and references the sitemap.
- View source (not devtools-rendered DOM) on a real experience page and a real host page in dev, confirm the `<title>`, `<meta description>`, canonical `<link>`, and `<script type="application/ld+json">` all reflect that specific listing/host, not the homepage defaults.
- Paste the JSON-LD output for one experience and one host page through Google's Rich Results Test to confirm it validates as `Product`/`Offer` and `ProfilePage`/`Person` with no errors.
- Confirm an experience/host with zero reviews renders JSON-LD with no `aggregateRating` key at all (not `reviewCount: 0`).
- Confirm `/about`, `/experiences`, and one real `/experiences/[id]` page each have distinct canonical URLs (no more shared homepage canonical).
