import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="bg-slate-950 border-b border-slate-800/60 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-white hover:text-blue-400 transition"
          >
            <svg
              className="w-4 h-4 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            CommuteCalc
          </Link>
          <Link
            href="/privacy"
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </nav>
  );
}
