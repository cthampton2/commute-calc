import { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Commute Map Calculator — Compare Driving Times from Multiple Locations",
  description:
    "Stop checking Google Maps one address at a time. Add the homes you're comparing, enter your workplace, and see every commute side-by-side on an interactive map. Free, no sign-up.",
  alternates: {
    canonical: "/tools/commute-comparison",
  },
  openGraph: {
    title: "Commute Map Calculator | CommuteCalc",
    description:
      "Stop checking Google Maps one address at a time. Add the homes you're comparing, enter your workplace, and see every commute side-by-side on a map. Free, no sign-up.",
    url: "https://commutecalc.com/tools/commute-comparison",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Commute Map Calculator | CommuteCalc",
    description:
      "Stop checking Google Maps one address at a time. Add the homes you're comparing, enter your workplace, and see every commute side-by-side on a map. Free, no sign-up.",
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

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a commute map calculator?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A commute map calculator lets you enter multiple home addresses and destinations — like your workplace, gym, or school — and see the driving time between each pair plotted on an interactive map. Instead of checking Google Maps one route at a time, you get a side-by-side commute time comparison so you can instantly see which home has the shortest overall commute.",
      },
    },
    {
      "@type": "Question",
      name: "How do I compare commute times from multiple locations?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Add each home address you're considering under 'Homes You're Considering,' then add your workplace and any other regular destinations under 'Where You Need to Go.' Hit Calculate — the tool computes driving times for every combination and displays them in a matrix. Click any route to highlight it on the commute map.",
      },
    },
    {
      "@type": "Question",
      name: "What is a commute radius map?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A commute radius map shows all the areas you can reach within a certain drive time — for example, everywhere within a 30-minute drive of your office. CommuteCalc calculates point-to-point commute times between specific addresses, giving you exact driving times rather than a general radius. This is more useful when you're comparing specific homes or neighborhoods.",
      },
    },
    {
      "@type": "Question",
      name: "How does CommuteCalc compare to Google Maps for commute time?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Google Maps is great for checking a single route, but it can only show one origin-to-destination commute at a time. CommuteCalc lets you compare commute times from multiple home addresses to multiple destinations simultaneously in one view — something you'd otherwise have to check manually, one tab at a time. Use CommuteCalc for the comparison, then use Google Maps during peak hours to verify traffic for your top choice.",
      },
    },
    {
      "@type": "Question",
      name: "What is a commute distance map?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A commute distance map visualizes driving distances between home and work locations on an interactive map. CommuteCalc shows both driving time and distance for every home-to-destination pair, plotted on a map so you can see the actual routes. This helps you understand not just how far a commute is in miles, but how long it actually takes to drive.",
      },
    },
    {
      "@type": "Question",
      name: "How accurate is the commute time calculator?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Commute times are calculated using OSRM (Open Source Routing Machine) with OpenStreetMap road data and represent typical driving durations without real-time traffic. Results are accurate for route planning purposes but may vary based on time of day, traffic conditions, and road changes. For rush-hour accuracy, cross-reference with Google Maps during peak hours.",
      },
    },
    {
      "@type": "Question",
      name: "Is this commute calculator free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — CommuteCalc is completely free with no account required. Your locations are saved locally in your browser so your data stays private and your session is preserved if you close and reopen the tab.",
      },
    },
    {
      "@type": "Question",
      name: "When should I use a commute comparison tool?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The best time to use a commute time calculator is during a home search, before signing a lease, or when evaluating a job offer. Commute time is one of the biggest factors in daily quality of life — a 45-minute one-way commute adds over 7 hours a week to your workday. Mapping your commute before committing can save years of frustration.",
      },
    },
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
      <Script
        id="commute-faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
