"use client";

import { Location, CommuteMatrix, SelectedRoute, ResolvedLocation } from "../types";
import { formatDuration, formatDistance, extractStreetAddress, formatWeeklyTime } from "../utils";

interface ResultsMatrixProps {
  startingLocations: Location[];
  pointsOfInterest: Location[];
  matrix: CommuteMatrix;
  selectedRoute: SelectedRoute | null;
  onSelectRoute: (route: SelectedRoute) => void;
}

function getResolvedLocation(poi: Location, startId: string): ResolvedLocation | null {
  if (!poi.isFindNearest || !poi.resolvedLocations) return null;
  return poi.resolvedLocations.find((r) => r.startingLocationId === startId) || null;
}

export default function ResultsMatrix({
  startingLocations,
  pointsOfInterest,
  matrix,
  selectedRoute,
  onSelectRoute,
}: ResultsMatrixProps) {
  if (startingLocations.length === 0 || pointsOfInterest.length === 0) return null;

  // Best duration per POI column
  const bestDurations: { [poiId: string]: number } = {};
  for (const poi of pointsOfInterest) {
    let min = Infinity;
    for (const start of startingLocations) {
      const r = matrix[start.id]?.[poi.id];
      if (r && r.durationSeconds < min) min = r.durationSeconds;
    }
    if (min !== Infinity) bestDurations[poi.id] = min;
  }

  const hasWeeklyTrips = pointsOfInterest.some((p) => p.tripsPerWeek && p.tripsPerWeek > 0);

  const weeklyTotals: { [startId: string]: number } = {};
  if (hasWeeklyTrips) {
    for (const start of startingLocations) {
      let total = 0;
      for (const poi of pointsOfInterest) {
        const r = matrix[start.id]?.[poi.id];
        if (r && poi.tripsPerWeek && poi.tripsPerWeek > 0) {
          total += r.durationSeconds * poi.tripsPerWeek * 2;
        }
      }
      weeklyTotals[start.id] = total;
    }
  }

  const bestWeeklyTotal = hasWeeklyTrips
    ? Math.min(...Object.values(weeklyTotals).filter((t) => t > 0))
    : 0;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[360px]">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-950/60 sticky left-0 z-10">
                From / To
              </th>
              {pointsOfInterest.map((poi) => (
                <th key={poi.id} className="px-3 py-2.5 text-center bg-slate-950/60">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px] font-semibold text-white truncate max-w-[80px]">{poi.nickname}</span>
                    {poi.isFindNearest && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-violet-400 font-normal normal-case">
                        <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {poi.searchQuery}
                      </span>
                    )}
                    {poi.tripsPerWeek ? (
                      <span className="text-[9px] text-amber-500/80 font-normal normal-case">{poi.tripsPerWeek}×/wk</span>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {startingLocations.map((start) => {
              const weeklyTotal = weeklyTotals[start.id] || 0;
              const isBestTotal = hasWeeklyTrips && weeklyTotal > 0 && weeklyTotal === bestWeeklyTotal;
              return (
                <tr key={start.id} className="group">
                  <td className="px-3 py-2.5 bg-slate-950/40 sticky left-0 z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white truncate max-w-[70px]">{start.nickname}</span>
                      {isBestTotal && startingLocations.length > 1 && (
                        <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center" title="Best weekly commute">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                    {hasWeeklyTrips && weeklyTotal > 0 && (
                      <p className={`text-[10px] mt-0.5 tabular-nums ${isBestTotal ? "text-emerald-400 font-medium" : "text-slate-500"}`}>
                        {formatWeeklyTime(weeklyTotal)}/wk
                      </p>
                    )}
                  </td>

                  {pointsOfInterest.map((poi) => {
                    const result = matrix[start.id]?.[poi.id];
                    const resolvedLocation = getResolvedLocation(poi, start.id);
                    const isSelected = selectedRoute?.fromId === start.id && selectedRoute?.toId === poi.id;
                    const isBest = result && bestDurations[poi.id] === result.durationSeconds && startingLocations.length > 1;

                    return (
                      <td
                        key={poi.id}
                        onClick={() => result && onSelectRoute({ fromId: start.id, toId: poi.id })}
                        className={`px-3 py-2.5 text-center cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-600/20 ring-1 ring-inset ring-blue-500/50"
                            : isBest
                            ? "bg-emerald-900/20 hover:bg-emerald-900/30"
                            : "hover:bg-slate-800/50"
                        }`}
                      >
                        {result ? (
                          <div>
                            <p className={`text-sm font-bold tabular-nums tracking-tight ${
                              isBest ? "text-emerald-400" : isSelected ? "text-blue-300" : "text-white"
                            }`}>
                              {formatDuration(result.durationSeconds)}
                            </p>
                            <p className="text-[10px] text-slate-500 tabular-nums">
                              {formatDistance(result.distanceMeters)}
                            </p>
                            {poi.tripsPerWeek && poi.tripsPerWeek > 0 && (
                              <p className="text-[10px] text-amber-500/80 tabular-nums mt-0.5">
                                {formatWeeklyTime(result.durationSeconds * poi.tripsPerWeek * 2)}/wk
                              </p>
                            )}
                            {poi.isFindNearest && resolvedLocation && (
                              <p className="hidden sm:block text-[9px] text-violet-400 mt-0.5 truncate max-w-[120px] mx-auto" title={resolvedLocation.businessName || resolvedLocation.address}>
                                → {resolvedLocation.businessName || extractStreetAddress(resolvedLocation.address)}
                              </p>
                            )}
                            {poi.isFindNearest && !resolvedLocation && (
                              <p className="text-[9px] text-red-500/70 mt-0.5">not found</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-700 text-sm">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-slate-800/60">
        <p className="text-[10px] text-slate-600">
          Tap a cell to highlight the route on the map.{" "}
          {startingLocations.length > 1 && <span className="text-emerald-600">Green = shortest commute per destination.</span>}
        </p>
      </div>
    </div>
  );
}
