"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Location, SelectedRoute } from "./types";
import { calculateCenterPoint } from "./utils";
import { useRouteCalculation } from "./hooks/useRouteCalculation";
import LocationList from "./components/LocationList";
import ResultsMatrix from "./components/ResultsMatrix";
import { AnalyticsEvents } from "@/app/lib/analytics";

const CommuteMap = dynamic(() => import("./components/CommuteMap"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl h-[400px] flex items-center justify-center bg-slate-900 border border-slate-800">
      <span className="text-slate-500 text-sm">Loading map…</span>
    </div>
  ),
});

const STORAGE_KEY_STARTING = "commute-comparison-starting-locations";
const STORAGE_KEY_POI = "commute-comparison-poi";

export default function CommuteComparisonPage() {
  const [startingLocations, setStartingLocations] = useState<Location[]>([]);
  const [pointsOfInterest, setPointsOfInterest] = useState<Location[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<SelectedRoute | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const {
    matrix,
    resolvedPOIs,
    isCalculating,
    error,
    progress,
    calculateRoutes,
    clearMatrix,
  } = useRouteCalculation();

  useEffect(() => {
    try {
      const savedStarting = localStorage.getItem(STORAGE_KEY_STARTING);
      const savedPOI = localStorage.getItem(STORAGE_KEY_POI);
      if (savedStarting) {
        const parsed = JSON.parse(savedStarting);
        if (Array.isArray(parsed)) setStartingLocations(parsed);
      }
      if (savedPOI) {
        const parsed = JSON.parse(savedPOI);
        if (Array.isArray(parsed)) setPointsOfInterest(parsed);
      }
    } catch (err) {
      console.error("Failed to load locations from localStorage:", err);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY_STARTING, JSON.stringify(startingLocations));
      } catch (err) {
        console.error("Failed to save starting locations:", err);
      }
    }
  }, [startingLocations, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem(STORAGE_KEY_POI, JSON.stringify(pointsOfInterest));
      } catch (err) {
        console.error("Failed to save POIs:", err);
      }
    }
  }, [pointsOfInterest, isHydrated]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkMode(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const biasLocation = useMemo(() => {
    return calculateCenterPoint([...startingLocations, ...pointsOfInterest]);
  }, [startingLocations, pointsOfInterest]);

  const hasResults = Object.keys(matrix).length > 0;
  const findNearestCount = pointsOfInterest.filter((p) => p.isFindNearest).length;
  const maxFindNearest = 1;
  const displayPOIs = resolvedPOIs.length > 0 ? resolvedPOIs : pointsOfInterest;

  useEffect(() => {
    if (hasResults && !selectedRoute && startingLocations.length > 0 && pointsOfInterest.length > 0) {
      setSelectedRoute({ fromId: startingLocations[0].id, toId: pointsOfInterest[0].id });
    }
  }, [hasResults, selectedRoute, startingLocations, pointsOfInterest]);

  const handleAddStarting = (location: Location) => { setStartingLocations((p) => [...p, location]); clearMatrix(); };
  const handleUpdateStarting = (id: string, updates: Partial<Location>) => { setStartingLocations((p) => p.map((l) => l.id === id ? { ...l, ...updates } : l)); clearMatrix(); };
  const handleDeleteStarting = (id: string) => { setStartingLocations((p) => p.filter((l) => l.id !== id)); clearMatrix(); if (selectedRoute?.fromId === id) setSelectedRoute(null); };

  const handleAddPOI = (location: Location) => { setPointsOfInterest((p) => [...p, location]); clearMatrix(); };
  const handleUpdatePOI = (id: string, updates: Partial<Location>) => { setPointsOfInterest((p) => p.map((l) => l.id === id ? { ...l, ...updates } : l)); clearMatrix(); };
  const handleDeletePOI = (id: string) => { setPointsOfInterest((p) => p.filter((l) => l.id !== id)); clearMatrix(); if (selectedRoute?.toId === id) setSelectedRoute(null); };

  const handleCalculate = () => {
    AnalyticsEvents.calculateCommute(startingLocations.length + pointsOfInterest.length);
    calculateRoutes(startingLocations, pointsOfInterest);
  };

  const canCalculate = startingLocations.length > 0 && pointsOfInterest.length > 0 && !isCalculating;
  const readyToCalculate = startingLocations.length > 0 && pointsOfInterest.length > 0;
  const estimatedTimeRemaining = isCalculating ? Math.ceil((progress.total - progress.current) * 1.1) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <span className="text-slate-700 text-xs mx-0.5">/</span>
          <span className="text-sm text-slate-300 font-medium">Commute Comparison</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-10 pb-20">

        {/* Hero */}
        <div className="mb-12">
          <p className="text-xs font-mono text-blue-400 tracking-[0.2em] uppercase mb-3">
            Free Commute Map Calculator
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05] mb-4">
            Before you sign<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              know your commute.
            </span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Add homes you&apos;re considering and your workplace or other destinations. We&apos;ll calculate driving times and map every commute route so the best option is obvious.
          </p>
        </div>

        {/* Step 1 */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-blue-500/40 bg-blue-950/40 text-xs font-mono font-bold text-blue-400 flex-shrink-0">
              1
            </span>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
              Homes You&apos;re Considering
            </h2>
          </div>
          <LocationList
            title="Starting Locations"
            locations={startingLocations}
            onAdd={handleAddStarting}
            onUpdate={handleUpdateStarting}
            onDelete={handleDeleteStarting}
            biasLocation={biasLocation}
            emptyMessage="Add locations you're considering living at"
            placeholder={{ nickname: "e.g., Apt A", address: "Search address…" }}
            accentColor="blue"
          />
        </div>

        <div className="my-8 border-t border-slate-800/60" />

        {/* Step 2 */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-emerald-500/40 bg-emerald-950/40 text-xs font-mono font-bold text-emerald-400 flex-shrink-0">
              2
            </span>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
              Where You Need to Go
            </h2>
          </div>
          <LocationList
            title="Points of Interest"
            locations={pointsOfInterest}
            onAdd={handleAddPOI}
            onUpdate={handleUpdatePOI}
            onDelete={handleDeletePOI}
            biasLocation={biasLocation}
            emptyMessage="Add places you need to commute to"
            placeholder={{ nickname: "e.g., Work", address: "Search address…" }}
            enableFindNearest={true}
            findNearestCount={findNearestCount}
            maxFindNearest={maxFindNearest}
            accentColor="emerald"
          />
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10">
          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className={[
              "w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300",
              canCalculate
                ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_45px_rgba(99,102,241,0.5)] hover:from-blue-500 hover:to-violet-500 active:scale-[0.99]"
                : isCalculating
                ? "bg-gradient-to-r from-blue-700/60 to-violet-700/60 text-white/60 cursor-not-allowed"
                : "bg-slate-900 text-slate-500 cursor-not-allowed border border-slate-800",
            ].join(" ")}
          >
            {isCalculating ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Calculating routes…
              </>
            ) : (
              <>
                Calculate Commutes
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
          {!readyToCalculate && (
            <p className="text-center text-xs text-slate-600 mt-3">
              Add at least one home and one destination to continue
            </p>
          )}
        </div>

        {/* Progress */}
        {isCalculating && (
          <div className="mt-5 rounded-xl bg-slate-900 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              {progress.phase && (
                <span className={[
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                  progress.phase === "Resolving nearest locations"
                    ? "bg-violet-950/60 text-violet-300 border border-violet-800/40"
                    : "bg-blue-950/60 text-blue-300 border border-blue-800/40",
                ].join(" ")}>
                  {progress.phase}
                </span>
              )}
              <span className="text-xs text-slate-500 tabular-nums ml-auto">{progress.current}/{progress.total}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2.5">
              <div
                className={[
                  "h-1.5 rounded-full transition-all duration-500",
                  progress.phase === "Resolving nearest locations"
                    ? "bg-gradient-to-r from-violet-500 to-pink-500"
                    : "bg-gradient-to-r from-blue-500 to-violet-500",
                ].join(" ")}
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{progress.currentRoute}</p>
              <p className="text-xs text-slate-600">~{estimatedTimeRemaining}s left</p>
            </div>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <span className="flex h-6 w-6 items-center justify-center rounded border border-amber-500/40 bg-amber-950/40 text-xs font-mono font-bold text-amber-400 flex-shrink-0">
                3
              </span>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">Results</h2>
            </div>
            <ResultsMatrix
              startingLocations={startingLocations}
              pointsOfInterest={displayPOIs}
              matrix={matrix}
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
            />
            <div className="mt-5 flex items-center justify-between px-1">
              <button
                onClick={() => setShowMap((v) => !v)}
                className={`flex items-center gap-2 text-sm transition ${showMap ? "text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showMap ? "bg-blue-600" : "bg-slate-700"}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showMap ? "translate-x-4" : "translate-x-0.5"}`} />
                </span>
                Show Map
              </button>
              <span className="text-xs text-slate-600">
                Routing by{" "}
                <a href="https://project-osrm.org/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition">OSRM</a>
                {" "}·{" "}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition">OSM</a>
              </span>
            </div>
          </div>
        )}

        {hasResults && showMap && (
          <div className="mt-4">
            <CommuteMap
              startingLocations={startingLocations}
              pointsOfInterest={pointsOfInterest}
              matrix={matrix}
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
              isDarkMode={isDarkMode}
            />
          </div>
        )}

        {/* FAQ / SEO Content */}
        <div className="mt-20 pt-10 border-t border-slate-800/60">
          <h2 className="text-lg font-bold text-slate-200 mb-8">About the Commute Map Calculator</h2>
          <div className="space-y-7">
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">What is a commute map calculator?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                A commute map calculator lets you enter multiple home addresses and destinations — like your workplace, gym, or school — and see the driving time between each pair plotted on an interactive map. Instead of checking Google Maps one route at a time, you get a side-by-side commute time comparison so you can instantly see which home has the shortest overall commute.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">How do I compare commute times from multiple locations?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Add each home address you&apos;re considering under &ldquo;Homes You&apos;re Considering,&rdquo; then add your workplace and any other regular destinations under &ldquo;Where You Need to Go.&rdquo; Hit Calculate — the tool computes driving times for every combination and displays them in a matrix. Click any route to highlight it on the commute map.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">What is a commute radius map?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                A commute radius map shows all the areas you can reach within a certain drive time — for example, everywhere within a 30-minute drive of your office. CommuteCalc calculates point-to-point commute times between specific addresses, giving you exact driving times rather than a general radius. This is more useful when you&apos;re comparing specific homes or neighborhoods.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">How accurate is the commute time calculator?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Commute times are calculated using OSRM (Open Source Routing Machine) with OpenStreetMap road data and represent typical driving durations without real-time traffic. Results are accurate for route planning purposes but may vary based on time of day, traffic conditions, and road changes. For rush-hour accuracy, cross-reference with Google Maps during peak hours.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Is this commute calculator free?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Yes — CommuteCalc is completely free with no account required. Your locations are saved locally in your browser so your data stays private and your session is preserved if you close and reopen the tab.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">When should I use a commute comparison tool?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                The best time to use a commute time calculator is during a home search, before signing a lease, or when evaluating a job offer. Commute time is one of the biggest factors in daily quality of life — a 45-minute one-way commute adds over 7 hours a week to your workday. Mapping your commute before committing can save years of frustration.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">How does CommuteCalc compare to Google Maps for commute time?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Google Maps is great for checking a single route, but it can only show one origin-to-destination commute at a time. CommuteCalc lets you compare commute times from multiple home addresses to multiple destinations simultaneously in one view — something you&apos;d otherwise have to check manually, one tab at a time. Use CommuteCalc for the comparison, then use Google Maps during peak hours to verify traffic for your top choice.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">What is a commute distance map?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                A commute distance map visualizes driving distances between home and work locations on an interactive map. CommuteCalc shows both driving time and distance for every home-to-destination pair, plotted on a map so you can see the actual routes. This helps you understand not just how far a commute is in miles, but how long it actually takes to drive.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
