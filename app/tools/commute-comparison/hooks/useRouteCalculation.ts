"use client";

import { useState, useCallback, useRef } from "react";
import {
  Location,
  RouteResult,
  CommuteMatrix,
  ResolvedLocation,
  NominatimResult,
  Coordinates,
} from "../types";
import {
  createViewbox,
  calculateDistanceMeters,
  formatNominatimAddress,
  extractNominatimBusinessName,
} from "../utils";

const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions/driving-car";
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

const FIND_NEAREST_RADIUS_MILES = 10;
const FIND_NEAREST_MAX_CANDIDATES = 5;

// Route result cache
const ROUTE_CACHE_KEY = "commute-route-cache";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  result: RouteResult;
  cachedAt: number;
}

interface RouteCache {
  [key: string]: CacheEntry;
}

function routeCacheKey(from: Coordinates, to: Coordinates): string {
  const r = (n: number) => Math.round(n * 100000) / 100000;
  return `${r(from.lon)},${r(from.lat)}->${r(to.lon)},${r(to.lat)}`;
}

function loadRouteCache(): RouteCache {
  try {
    const raw = localStorage.getItem(ROUTE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as RouteCache) : {};
  } catch {
    return {};
  }
}

function saveRouteCache(cache: RouteCache): void {
  try {
    const now = Date.now();
    const pruned: RouteCache = {};
    for (const [k, v] of Object.entries(cache)) {
      if (now - v.cachedAt < CACHE_TTL_MS) pruned[k] = v;
    }
    localStorage.setItem(ROUTE_CACHE_KEY, JSON.stringify(pruned));
  } catch {
    // localStorage full or unavailable
  }
}

interface UseRouteCalculationResult {
  matrix: CommuteMatrix;
  resolvedPOIs: Location[];
  isCalculating: boolean;
  error: string | null;
  progress: { current: number; total: number; currentRoute: string; phase: string };
  calculateRoutes: (
    startingLocations: Location[],
    pointsOfInterest: Location[]
  ) => Promise<void>;
  clearMatrix: () => void;
}

async function executeSequentially<T>(
  tasks: Array<{ task: () => Promise<T>; label: string }>,
  delayMs: number,
  onProgress?: (completed: number, label: string) => void
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i++) {
    const { task, label } = tasks[i];
    if (onProgress) onProgress(i, label);
    results.push(await task());
    if (i < tasks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  if (onProgress) onProgress(tasks.length, "Complete");
  return results;
}

async function searchNearestBusiness(
  searchQuery: string,
  center: Coordinates
): Promise<ResolvedLocation | null> {
  try {
    const viewbox = createViewbox(center, FIND_NEAREST_RADIUS_MILES);
    const params = new URLSearchParams({
      q: searchQuery,
      format: "json",
      addressdetails: "1",
      limit: FIND_NEAREST_MAX_CANDIDATES.toString(),
      countrycodes: "us",
      viewbox,
      bounded: "1",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      headers: { "User-Agent": "RealEstateToolkit/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const results: NominatimResult[] = await response.json();
    if (!results || results.length === 0) return null;

    let nearest: NominatimResult | null = null;
    let nearestDistance = Infinity;
    for (const result of results) {
      const coords: Coordinates = { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
      const dist = calculateDistanceMeters(center, coords);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearest = result;
      }
    }

    if (!nearest) return null;

    return {
      startingLocationId: "",
      address: formatNominatimAddress(nearest),
      businessName: extractNominatimBusinessName(nearest) || nearest.name,
      coordinates: { lat: parseFloat(nearest.lat), lon: parseFloat(nearest.lon) },
    };
  } catch {
    return null;
  }
}

export function useRouteCalculation(): UseRouteCalculationResult {
  const [matrix, setMatrix] = useState<CommuteMatrix>({});
  const [resolvedPOIs, setResolvedPOIs] = useState<Location[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    currentRoute: "",
    phase: "",
  });

  // Tracks completed route count for progress during parallel execution
  const completedRoutesRef = useRef(0);

  const fetchSingleRoute = useCallback(
    async (
      from: Location,
      toCoordinates: Coordinates,
      toId: string,
      toNickname: string
    ): Promise<RouteResult | null> => {
      try {
        const url = `${ORS_BASE_URL}?start=${from.coordinates.lon},${from.coordinates.lat}&end=${toCoordinates.lon},${toCoordinates.lat}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, {
          headers: { Authorization: process.env.NEXT_PUBLIC_ORS_API_KEY ?? "" },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error(`Route error ${from.nickname} -> ${toNickname}: ${response.status}`);
          return null;
        }

        const data = await response.json();
        const feature = data.features?.[0];
        const summary = feature?.properties?.summary;
        const coords: [number, number][] = feature?.geometry?.coordinates ?? [];

        if (!summary || coords.length === 0) return null;

        const geometry: [number, number][] = coords.map(([lon, lat]) => [lat, lon]);
        return {
          fromId: from.id,
          toId,
          durationSeconds: summary.duration,
          distanceMeters: summary.distance,
          geometry,
        };
      } catch {
        return null;
      }
    },
    []
  );

  const calculateRoutes = useCallback(
    async (startingLocations: Location[], pointsOfInterest: Location[]) => {
      if (startingLocations.length === 0 || pointsOfInterest.length === 0) {
        setError("Please add at least one starting location and one point of interest");
        return;
      }

      setIsCalculating(true);
      setError(null);
      setMatrix({});
      completedRoutesRef.current = 0;

      const findNearestPOIs = pointsOfInterest.filter((p) => p.isFindNearest);
      const resolutionTasks = findNearestPOIs.length * startingLocations.length;
      const routeTasks = startingLocations.length * pointsOfInterest.length;
      const totalTasks = resolutionTasks + routeTasks;

      setProgress({
        current: 0,
        total: totalTasks,
        currentRoute: "Starting...",
        phase: findNearestPOIs.length > 0 ? "Resolving nearest locations" : "Calculating routes",
      });

      try {
        // Phase 1: Resolve find-nearest POIs (sequential — Nominatim rate limit)
        const resolvedPOIsCopy: Location[] = [...pointsOfInterest];

        if (findNearestPOIs.length > 0) {
          const resolutionTaskList: Array<{
            task: () => Promise<{ poiId: string; startId: string; resolved: ResolvedLocation | null }>;
            label: string;
          }> = [];

          for (const poi of findNearestPOIs) {
            for (const start of startingLocations) {
              resolutionTaskList.push({
                task: async () => {
                  const resolved = await searchNearestBusiness(
                    poi.searchQuery || poi.nickname,
                    start.coordinates
                  );
                  if (resolved) resolved.startingLocationId = start.id;
                  return { poiId: poi.id, startId: start.id, resolved };
                },
                label: `Finding ${poi.searchQuery || poi.nickname} near ${start.nickname}`,
              });
            }
          }

          const resolutionResults = await executeSequentially(
            resolutionTaskList,
            1100,
            (completed, label) => {
              setProgress({
                current: completed,
                total: totalTasks,
                currentRoute: label,
                phase: "Resolving nearest locations",
              });
            }
          );

          for (const { poiId, resolved } of resolutionResults) {
            if (resolved) {
              const idx = resolvedPOIsCopy.findIndex((p) => p.id === poiId);
              if (idx !== -1) {
                const poi = resolvedPOIsCopy[idx];
                if (!poi.resolvedLocations) poi.resolvedLocations = [];
                poi.resolvedLocations = poi.resolvedLocations.filter(
                  (r) => r.startingLocationId !== resolved.startingLocationId
                );
                poi.resolvedLocations.push(resolved);
              }
            }
          }
        }

        setResolvedPOIs(resolvedPOIsCopy);

        // Phase 2: Calculate all routes in parallel
        setProgress({
          current: resolutionTasks,
          total: totalTasks,
          currentRoute: "Calculating routes...",
          phase: "Calculating routes",
        });

        const cache = loadRouteCache();
        const updatedCache = { ...cache };

        const routePromises = [];

        for (const start of startingLocations) {
          for (const poi of resolvedPOIsCopy) {
            let destCoordinates = poi.coordinates;
            let destNickname = poi.nickname;

            if (poi.isFindNearest && poi.resolvedLocations) {
              const resolved = poi.resolvedLocations.find((r) => r.startingLocationId === start.id);
              if (resolved) {
                destCoordinates = resolved.coordinates;
                destNickname = `${poi.nickname} (${resolved.businessName || resolved.address})`;
              }
            }

            const fromId = start.id;
            const toId = poi.id;
            const cachedResult = cache[routeCacheKey(start.coordinates, destCoordinates)];
            const isCacheHit =
              cachedResult && Date.now() - cachedResult.cachedAt < CACHE_TTL_MS;

            const promise = (async () => {
              let result: RouteResult | null;

              if (isCacheHit) {
                // Rehydrate IDs in case locations changed nicknames but not coordinates
                result = { ...cachedResult.result, fromId, toId };
              } else {
                result = await fetchSingleRoute(start, destCoordinates, toId, destNickname);
                if (result) {
                  updatedCache[routeCacheKey(start.coordinates, destCoordinates)] = {
                    result,
                    cachedAt: Date.now(),
                  };
                }
              }

              // Update matrix incrementally as each route resolves
              if (result) {
                setMatrix((prev) => ({
                  ...prev,
                  [fromId]: { ...prev[fromId], [toId]: result },
                }));
              }

              completedRoutesRef.current += 1;
              setProgress({
                current: resolutionTasks + completedRoutesRef.current,
                total: totalTasks,
                currentRoute: `${start.nickname} → ${poi.nickname}`,
                phase: "Calculating routes",
              });

              return { fromId, toId, result };
            })();

            routePromises.push(promise);
          }
        }

        const routeResults = await Promise.all(routePromises);
        saveRouteCache(updatedCache);

        const allFailed =
          routeResults.length > 0 && routeResults.every(({ result }) => result === null);
        if (allFailed) {
          setError("Could not reach the routing service. Please check your connection and try again.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to calculate routes");
      } finally {
        setIsCalculating(false);
      }
    },
    [fetchSingleRoute]
  );

  const clearMatrix = useCallback(() => {
    setMatrix({});
    setResolvedPOIs([]);
    setProgress({ current: 0, total: 0, currentRoute: "", phase: "" });
    setError(null);
  }, []);

  return {
    matrix,
    resolvedPOIs,
    isCalculating,
    error,
    progress,
    calculateRoutes,
    clearMatrix,
  };
}
