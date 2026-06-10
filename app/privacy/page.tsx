import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for CommuteCalc — how we handle your data.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-2xl mx-auto px-4 pt-12 pb-20">

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm mb-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </Link>

        <h1 className="text-3xl font-black tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: June 2025</p>

        <div className="space-y-8 text-slate-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Overview</h2>
            <p>
              CommuteCalc (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates commutecalc.com. This page
              explains what information is collected when you use our site and how it is used.
              We do not collect personal accounts, email addresses, or payment information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Information You Enter</h2>
            <p>
              Addresses and location nicknames you enter into the tool are stored only in your
              browser&apos;s local storage. This data never leaves your device and is not transmitted
              to our servers or stored in any database. You can clear it at any time by clearing
              your browser&apos;s local storage or site data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Address Search</h2>
            <p>
              When you search for an address, the text you type is sent to Mapbox via our
              server-side proxy to return address suggestions. Mapbox may log these requests
              in accordance with their own privacy policy. No address searches are stored by
              CommuteCalc. You can review Mapbox&apos;s privacy policy at{" "}
              <a
                href="https://www.mapbox.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                mapbox.com/legal/privacy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Route Calculation</h2>
            <p>
              When you calculate commute times, coordinates are sent to OpenRouteService to
              compute driving routes. OpenRouteService may log these requests per their own
              privacy policy at{" "}
              <a
                href="https://openrouteservice.org/privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                openrouteservice.org/privacy-policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Analytics</h2>
            <p>
              We use Google Analytics to understand how visitors use the site. Google Analytics
              collects anonymized usage data including pages visited, time on site, and general
              geographic region. This data is aggregated and does not identify individual users.
              You can opt out of Google Analytics tracking using the{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                Google Analytics Opt-out Browser Add-on
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Advertising</h2>
            <p>
              We use Google AdSense to display advertisements. Google AdSense uses cookies,
              including the DART cookie, to serve ads based on your visits to this and other
              sites. You may opt out of personalized advertising by visiting{" "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                Google&apos;s Ads Settings
              </a>
              {" "}or{" "}
              <a
                href="https://www.aboutads.info/choices/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                aboutads.info
              </a>.
              Third-party vendors, including Google, use cookies to serve ads based on prior
              visits to this website. For more information on how Google uses data, visit{" "}
              <a
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                Google&apos;s Privacy & Terms
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Cookies</h2>
            <p>
              CommuteCalc itself does not set cookies. Third-party services we use (Google
              Analytics, Google AdSense) may set cookies in your browser for analytics and
              advertising purposes as described above. You can control cookie preferences
              through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Children&apos;s Privacy</h2>
            <p>
              CommuteCalc is not directed at children under 13. We do not knowingly collect
              any information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be reflected
              by updating the date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Contact</h2>
            <p>
              If you have questions about this privacy policy, you can reach us through the
              contact information on our website.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
