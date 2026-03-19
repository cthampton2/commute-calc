import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navigation from "./components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CommuteCalc - Compare Commute Times",
    template: "%s | CommuteCalc",
  },
  description:
    "Compare driving commute times from multiple home locations to your workplace and points of interest. Find the best place to live based on your daily commute.",
  metadataBase: new URL("https://commutecalc.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "CommuteCalc - Compare Commute Times",
    description:
      "Compare driving commute times from multiple home locations to your workplace. Find the best place to live based on your daily commute.",
    url: "https://commutecalc.com",
    siteName: "CommuteCalc",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "CommuteCalc - Compare Commute Times",
    description:
      "Compare driving commute times from multiple home locations to your workplace. Find the best place to live based on your daily commute.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
  keywords: [
    "commute calculator",
    "compare commute times",
    "commute comparison tool",
    "best place to live commute",
    "driving time calculator",
    "commute distance calculator",
    "real estate commute tool",
    "find home by commute",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JME8PM4XBV"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JME8PM4XBV');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navigation />
        {children}
      </body>
    </html>
  );
}
