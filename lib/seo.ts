import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gozuru.com";

export const socialPreviewImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Gozuru preview showing curated local experiences for curious travelers",
};

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Gozuru – Your journey starts here",
    template: "%s | Gozuru",
  },
  description:
    "Gozuru delivers simple, fast experiences built for you. Explore vendors, schools, pricing, and resources.",
  keywords: [
    "Gozuru",
    "vendors",
    "schools",
    "pricing",
    "resources",
    "platform",
  ],
  authors: [{ name: "Gozuru", url: siteUrl }],
  creator: "Gozuru",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Gozuru",
    title: "Gozuru – Your journey starts here",
    description:
      "Gozuru delivers simple, fast experiences built for you. Explore vendors, schools, pricing, and resources.",
    images: [socialPreviewImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gozuru – Your journey starts here",
    description:
      "Gozuru delivers simple, fast experiences built for you. Explore vendors, schools, pricing, and resources.",
    images: [socialPreviewImage.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export function buildJsonLdOrganization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Gozuru",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description: defaultMetadata.description,
  };
}

export function buildJsonLdWebSite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Gozuru",
    url: siteUrl,
    description: defaultMetadata.description,
    publisher: buildJsonLdOrganization(),
  };
}
