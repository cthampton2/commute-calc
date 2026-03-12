"use client";

import { useState, useCallback } from "react";
import {
  Location,
  RouteResult,
  CommuteMatrix,
  ResolvedLocation,
  NominatimResult,
  Coordinates,
} from "../types";
import {
  decodePolyline,
  createViewbox,
  calculateDistanceMeters,
  formatNominatimAddress,
  extractNominatimBusinessName,
} from "../utils";

// OSRM public demo server - no API key required
// Rate limit: 1 request per second
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

// Find-nearest configuration
const FIND_NEAREST_RADIUS_MILES = 10;
const FIND_NEAREST_MAX_CANDIDATES = 5;

interface OSRMResponse {
  code: string;
  routes: Array<{
    distance: number; // meters
    duration: number; // seconds
    geometry: string; // encoded polyline
  }>;
}

interface UseRouteCalculationResult {
  matrix: CommuteMatrix;
  resolvedPOIs: Location[]; // POIs with resolvedLocations populated
  isCalculating: boolean;
  error: string | null;
  progress: { current: number; total: number; currentRoute: string; phase: string };
  calculateRoutes: (
    startingLocations: Location[],
    pointsOfInterest: Location[]
  ) => Promise<void>;
  clearMatrix: () => void;
}

/**
 * Execute tasks sequentially with delay between each (for rate limiting)
 */
async function executeSequentially<T>(
  tasks: Array<{ task: () => Promise<T>; label: string }>,
  delayMs: number,
  onProgress?: (completed: number, label: string) => void
): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const { task, label } = tasks[i];

    // Report progress before starting this task
    if (onProgress) {
      onProgress(i, label);
    }

    const result = await task();
    results.push(result);

    // Add delay between requests (except after the last one)
    if (i < tasks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress(tasks.length, "Complete");
  }

  return results;
}

/**
 * Search for nearest business matching query within radius of center
 */
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
      viewbox: viewbox,
      bounded: "1", // Strictly limit to viewbox
    });

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": "RealEstateToolkit/1.0",
      },
    });

    if (!response.ok) {
      console.error(`Nominatim search failed: ${response.status}`);
      return null;
    }

    const results: NominatimResult[] = await response.json();

    if (!results || results.length === 0) {
      return null;
    }

    // Find the nearest result by distance
    let nearest: NominatimResult | null = null;
    let nearestDistance = Infinity;

    for (const result of results) {
      const resultCoords: Coordinates = {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
      };
      const distance = calculateDistanceMeters(center, resultCoords);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = result;
      }
    }

    if (!nearest) {
      return null;
    }

    return {
      startingLocationId: "", // Will be set by caller
      address: formatNominatimAddress(nearest),
      businessName: extractNominatimBusinessName(nearest) || nearest.name,
      coordinates: {
        lat: parseFloat(nearest.lat),
        lon: parseFloat(nearest.lon),
      },
    };
  } catch (err) {
    console.error(`Failed to search for ${searchQuery}:`, err);
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

  const fetchSingleRoute = useCallback(
    async (
      from: Location,
      toCoordinates: Coordinates,
      toId: string,
      toNickname: string
    ): Promise<RouteResult | null> => {
      try {
        // OSRM expects coordinates as lon,lat;lon,lat
        const coordinates = `${from.coordinates.lon},${from.coordinates.lat};${toCoordinates.lon},${toCoordinates.lat}`;
        const url = `${OSRM_BASE_URL}/${coordinates}?overview=full&geometries=polyline`;

        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Route error ${from.nickname} -> ${toNickname}: ${response.status}`);
          return null;
        }

        const data: OSRMResponse = await response.json();

        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
          console.error(`No route found ${from.nickname} -> ${toNickname}`);
          return null;
        }

        const route = data.routes[0];

        return {
          fromId: from.id,
          toId: toId,
          durationSeconds: route.duration,
          distanceMeters: route.distance,
          geometry: decodePolyline(route.geometry),
        };
      } catch (err) {
        console.error(`Failed to fetch route ${from.nickname} -> ${toNickname}:`, err);
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

      // Separate find-nearest POIs from regular POIs
      const findNearestPOIs = pointsOfInterest.filter((p) => p.isFindNearest);
      const regularPOIs = pointsOfInterest.filter((p) => !p.isFindNearest);

      // Calculate total tasks for progress
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
        // Phase 1: Resolve find-nearest POIs
        const resolvedPOIsCopy: Location[] = [...pointsOfInterest];

        if (findNearestPOIs.length > 0) {
          const resolutionTaskList: Array<{
            task: () => Promise<{
              poiId: string;
              startId: string;
              resolved: ResolvedLocation | null;
            }>;
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
                  if (resolved) {
                    resolved.startingLocationId = start.id;
                  }
                  return {
                    poiId: poi.id,
                    startId: start.id,
                    resolved,
                  };
                },
                label: `Finding ${poi.searchQuery || poi.nickname} near ${start.nickname}`,
              });
            }
          }

          // Execute resolution tasks with rate limiting
          const resolutionResults = await executeSequentially(
            resolutionTaskList,
            1100, // Same rate limit as OSRM
            (completed, label) => {
              setProgress({
                current: completed,
                total: totalTasks,
                currentRoute: label,
                phase: "Resolving nearest locations",
              });
            }
          );

          // Update POIs with resolved locations
          for (const { poiId, resolved } of resolutionResults) {
            if (resolved) {
              const poiIndex = resolvedPOIsCopy.findIndex((p) => p.id === poiId);
              if (poiIndex !== -1) {
                const poi = resolvedPOIsCopy[poiIndex];
                if (!poi.resolvedLocations) {
                  poi.resolvedLocations = [];
                }
                // Remove existing resolution for this starting location
                poi.resolvedLocations = poi.resolvedLocations.filter(
                  (r) => r.startingLocationId !== resolved.startingLocationId
                );
                poi.resolvedLocations.push(resolved);
              }
            }
          }
        }

        setResolvedPOIs(resolvedPOIsCopy);

        // Phase 2: Calculate routes
        setProgress({
          current: resolutionTasks,
          total: totalTasks,
          currentRoute: "Starting route calculation...",
          phase: "Calculating routes",
        });

        const routeTaskList: Array<{
          task: () => Promise<{ fromId: string; toId: string; result: RouteResult | null }>;
          label: string;
        }> = [];

        for (const start of startingLocations) {
          for (const poi of resolvedPOIsCopy) {
            // Determine destination coordinates
            let destCoordinates = poi.coordinates;
            let destNickname = poi.nickname;

            if (poi.isFindNearest && poi.resolvedLocations) {
              const resolved = poi.resolvedLocations.find(
                (r) => r.startingLocationId === start.id
              );
              if (resolved) {
                destCoordinates = resolved.coordinates;
                destNickname = `${poi.nickname} (${resolved.businessName || resolved.address})`;
              }
            }

            routeTaskList.push({
              task: async () => ({
                fromId: start.id,
                toId: poi.id,
                result: await fetchSingleRoute(start, destCoordinates, poi.id, destNickname),
              }),
              label: `${start.nickname} → ${poi.nickname}`,
            });
          }
        }

        // Execute route tasks with rate limiting
        const routeResults = await executeSequentially(
          routeTaskList,
          1100,
          (completed, label) => {
            setProgress({
              current: resolutionTasks + completed,
              total: totalTasks,
              currentRoute: label,
              phase: "Calculating routes",
            });
          }
        );

        // Build the matrix from results
        const newMatrix: CommuteMatrix = {};

        for (const { fromId, toId, result } of routeResults) {
          if (!newMatrix[fromId]) {
            newMatrix[fromId] = {};
          }
          newMatrix[fromId][toId] = result;
        }

        setMatrix(newMatrix);
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
