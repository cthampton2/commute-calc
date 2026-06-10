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
            Google Maps shows one route at a time. This shows all of them — every home, every destination, one matrix. Pick the address that wins.
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
                <a href="https://openrouteservice.org/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition">OpenRouteService</a>
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

        {/* How it works */}
        <div className="mt-20 pt-10 border-t border-slate-800/60">
          <p className="text-xs font-mono text-slate-500 tracking-[0.2em] uppercase mb-6">How it works</p>
          <div className="grid grid-cols-3 gap-4 mb-16">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono text-blue-400 font-bold">01</span>
              <p className="text-sm font-semibold text-slate-200">Add your homes</p>
              <p className="text-xs text-slate-500 leading-relaxed">Enter every address you&apos;re deciding between. Label them anything — Apt A, House on Elm, whatever works.</p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono text-emerald-400 font-bold">02</span>
              <p className="text-sm font-semibold text-slate-200">Add destinations</p>
              <p className="text-xs text-slate-500 leading-relaxed">Work, gym, school, family — anywhere you drive regularly. Set how many times per week to see total commute time.</p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono text-amber-400 font-bold">03</span>
              <p className="text-sm font-semibold text-slate-200">See the answer</p>
              <p className="text-xs text-slate-500 leading-relaxed">Every route calculated at once. The fastest option highlights automatically. Click any cell to see that route on the map.</p>
            </div>
          </div>

          {/* FAQ */}
          <p className="text-xs font-mono text-slate-500 tracking-[0.2em] uppercase mb-6">Common questions</p>
          <div className="space-y-6">
            <div className="border-b border-slate-800/60 pb-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-1.5">What is a commute map calculator?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                A commute map calculator lets you enter multiple home addresses and destinations — like your workplace, gym, or school — and see the driving time between each pair plotted on an interactive map. Instead of checking Google Maps one route at a time, you get a side-by-side commute time comparison so you can instantly see which home has the shortest overall commute.
              </p>
            </div>
            <div className="border-b border-slate-800/60 pb-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-1.5">How does CommuteCalc compare to Google Maps?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Google Maps shows one route at a time. CommuteCalc computes every home-to-destination combination simultaneously and displays them in a single matrix — something you&apos;d otherwise spend 20 minutes doing manually across multiple tabs. Use CommuteCalc to find your best option, then verify rush-hour timing in Google Maps.
              </p>
            </div>
            <div className="border-b border-slate-800/60 pb-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-1.5">How accurate are the commute times?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Times are based on OpenStreetMap road data and represent typical driving durations without real-time traffic. They&apos;re accurate for comparison purposes — if Apt A is 12 minutes shorter than Apt B here, it will be shorter in practice. For exact rush-hour times, cross-reference your top choice in Google Maps.
              </p>
            </div>
            <div className="border-b border-slate-800/60 pb-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-1.5">Is this free? Do I need an account?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Completely free, no account required. Your locations are saved in your browser so your session is there when you come back — nothing is stored on our servers.
              </p>
            </div>
            <div className="border-b border-slate-800/60 pb-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-1.5">When should I use this?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Before signing a lease, making an offer on a house, or accepting a job in a new city. Commute time is one of the biggest quality-of-life factors people underestimate — a 45-minute one-way commute adds over 7 hours to your week, every week.
              </p>
            </div>
            <div className="pb-2">
              <h3 className="text-sm font-semibold text-slate-300 mb-1.5">What is a commute radius map?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                A commute radius map shows every area reachable within a set drive time from a single point. CommuteCalc is different — it calculates exact point-to-point times between specific addresses. More useful when you already have specific homes in mind rather than exploring a region.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
