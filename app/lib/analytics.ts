declare global {
  interface Window {
    gtag: (
      command: "event" | "config" | "js",
      targetId: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}

// Pre-defined events for your tools
export const AnalyticsEvents = {
  // Loan Amortization
  calculateLoan: (loanAmount: number, interestRate: number, termYears: number) =>
    trackEvent("calculate_loan", {
      loan_amount: loanAmount,
      interest_rate: interestRate,
      term_years: termYears,
    }),

  // Refinance Calculator
  calculateRefinance: (currentRate: number, newRate: number, loanBalance: number) =>
    trackEvent("calculate_refinance", {
      current_rate: currentRate,
      new_rate: newRate,
      loan_balance: loanBalance,
    }),

  // Commute Comparison
  searchAddress: () => trackEvent("search_address"),
  calculateCommute: (numLocations: number) =>
    trackEvent("calculate_commute", { num_locations: numLocations }),

  // Lifestyle Radius
  calculateIsochrone: (minutes: number, travelMode: string) =>
    trackEvent("calculate_isochrone", {
      minutes,
      travel_mode: travelMode,
    }),

  // Blog
  readBlogPost: (slug: string, title: string) =>
    trackEvent("read_blog_post", { slug, title }),
};
