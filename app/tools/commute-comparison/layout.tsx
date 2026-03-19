import { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Commute Map Calculator — Compare Driving Times from Multiple Locations",
  description:
    "Free interactive commute map calculator. Add multiple home addresses and destinations to compare driving times side-by-side on a map. Find the best place to live based on your daily commute.",
  alternates: {
    canonical: "/tools/commute-comparison",
  },
  openGraph: {
    title: "Commute Map Calculator | CommuteCalc",
    description:
      "Free interactive commute map calculator. Compare driving times from multiple home locations to find the best place to live. No sign-up required.",
    url: "https://commutecalc.com/tools/commute-comparison",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Commute Map Calculator | CommuteCalc",
    description:
      "Free interactive commute map calculator. Compare driving times from multiple home locations to find the best place to live. No sign-up required.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Commute Map Calculator",
  url: "https://commutecalc.com/tools/commute-comparison",
  description:
    "Free interactive commute map calculator. Compare driving times from multiple home addresses to your workplace and other destinations side-by-side.",
  applicationCategory: "UtilityApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Compare commute times from multiple home locations",
    "Interactive commute map with route visualization",
    "Side-by-side driving time matrix",
    "No account or sign-up required",
    "Saves locations locally in browser",
  ],
};

export default function CommuteComparisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        id="commute-tool-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
