import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commute Comparison Tool | REFT",
  description:
    "Compare commute times from multiple home locations to your workplace and points of interest. Find the best location based on your daily driving needs.",
  openGraph: {
    title: "Commute Comparison Tool | REFT",
    description:
      "Compare commute times from multiple locations to find your ideal home.",
    type: "website",
  },
};

export default function CommuteComparisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
