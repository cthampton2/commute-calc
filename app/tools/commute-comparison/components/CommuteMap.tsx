"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Location, RouteResult, SelectedRoute, CommuteMatrix, ResolvedLocation, Coordinates } from "../types";
import { calculateBounds, formatDuration, formatDistance } from "../utils";

// Fix for default marker icons in Next.js/webpack
const startIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const poiIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Purple icon for find-nearest resolved locations
const findNearestIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/**
 * Check if coordinates are valid (not 0,0 placeholder)
 */
function isValidCoordinates(lat: number, lon: number): boolean {
  return !(lat === 0 && lon === 0);
}

/**
 * Get the resolved location for a find-nearest POI based on the selected starting location
 */
function getResolvedLocationForRoute(
  poi: Location,
  selectedFromId: string | undefined
): ResolvedLocation | null {
  if (!poi.isFindNearest || !poi.resolvedLocations || !selectedFromId) {
    return null;
  }
  return poi.resolvedLocations.find(r => r.startingLocationId === selectedFromId) || null;
}

interface FitBoundsProps {
  initialBounds: [[number, number], [number, number]] | null;
  routeBounds: [[number, number], [number, number]] | null;
  selectedRouteKey: string | null; // Used to detect route changes
}

function FitBounds({ initialBounds, routeBounds, selectedRouteKey }: FitBoundsProps) {
  const map = useMap();
  const hasInitialized = useRef(false);
  const lastRouteKey = useRef<string | null>(null);

  useEffect(() => {
    // Initial fit on first render
    if (!hasInitialized.current && initialBounds) {
      map.fitBounds(initialBounds, { padding: [50, 50] });
      hasInitialized.current = true;
    }
  }, [map, initialBounds]);

  useEffect(() => {
    // Animate to route bounds when route changes
    if (selectedRouteKey && selectedRouteKey !== lastRouteKey.current && routeBounds) {
      lastRouteKey.current = selectedRouteKey;
      // Use flyToBounds for smooth animation
      map.flyToBounds(routeBounds, {
        padding: [60, 60],
        duration: 0.8, // Animation duration in seconds
        easeLinearity: 0.25,
      });
    }
  }, [map, routeBounds, selectedRouteKey]);

  return null;
}

/**
 * Calculate bounds for a specific route (start point, end point, and route geometry)
 */
function calculateRouteBounds(
  startCoords: Coordinates,
  endCoords: Coordinates,
  geometry?: [number, number][]
): [[number, number], [number, number]] {
  const allPoints: [number, number][] = [
    [startCoords.lat, startCoords.lon],
    [endCoords.lat, endCoords.lon],
  ];

  if (geometry) {
    allPoints.push(...geometry);
  }

  let minLat = allPoints[0][0];
  let maxLat = allPoints[0][0];
  let minLon = allPoints[0][1];
  let maxLon = allPoints[0][1];

  for (const [lat, lon] of allPoints) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }

  // Add padding
  const latPadding = (maxLat - minLat) * 0.15 || 0.01;
  const lonPadding = (maxLon - minLon) * 0.15 || 0.01;

  return [
    [minLat - latPadding, minLon - lonPadding],
    [maxLat + latPadding, maxLon + lonPadding],
  ];
}

interface CommuteMapProps {
  startingLocations: Location[];
  pointsOfInterest: Location[];
  matrix: CommuteMatrix;
  selectedRoute: SelectedRoute | null;
  onSelectRoute: (route: SelectedRoute) => void;
  isDarkMode?: boolean;
}

export default function CommuteMap({
  startingLocations,
  pointsOfInterest,
  matrix,
  selectedRoute,
  onSelectRoute,
  isDarkMode = false,
}: CommuteMapProps) {
  // Get the selected route result
  const routeResult: RouteResult | null = useMemo(() => {
    if (!selectedRoute) return null;
    return matrix[selectedRoute.fromId]?.[selectedRoute.toId] || null;
  }, [matrix, selectedRoute]);

  // Get location names for display
  const fromLocation = selectedRoute
    ? startingLocations.find((l) => l.id === selectedRoute.fromId)
    : null;
  const toLocation = selectedRoute
    ? pointsOfInterest.find((l) => l.id === selectedRoute.toId)
    : null;

  // Calculate initial bounds - use ALL locations for the overview
  const initialBounds = useMemo(() => {
    const validLocations: Location[] = [...startingLocations];

    for (const poi of pointsOfInterest) {
      if (poi.isFindNearest && poi.resolvedLocations) {
        for (const resolved of poi.resolvedLocations) {
          if (isValidCoordinates(resolved.coordinates.lat, resolved.coordinates.lon)) {
            validLocations.push({
              ...poi,
              coordinates: resolved.coordinates,
            });
          }
        }
      } else if (isValidCoordinates(poi.coordinates.lat, poi.coordinates.lon)) {
        validLocations.push(poi);
      }
    }

    return calculateBounds(validLocations);
  }, [startingLocations, pointsOfInterest]);

  // Calculate route-specific bounds for the selected route
  const routeBounds = useMemo(() => {
    if (!selectedRoute || !fromLocation || !toLocation) return null;

    // Get destination coordinates (handle find-nearest POIs)
    let destCoords = toLocation.coordinates;
    if (toLocation.isFindNearest && toLocation.resolvedLocations) {
      const resolved = toLocation.resolvedLocations.find(
        r => r.startingLocationId === selectedRoute.fromId
      );
      if (resolved) {
        destCoords = resolved.coordinates;
      }
    }

    // Skip if invalid coordinates
    if (!isValidCoordinates(destCoords.lat, destCoords.lon)) return null;

    return calculateRouteBounds(
      fromLocation.coordinates,
      destCoords,
      routeResult?.geometry
    );
  }, [selectedRoute, fromLocation, toLocation, routeResult]);

  // Create a unique key for the selected route to detect changes
  const selectedRouteKey = selectedRoute
    ? `${selectedRoute.fromId}-${selectedRoute.toId}`
    : null;

  // Tile layer URL based on theme
  // Using CartoDB Voyager for dark mode - better road visibility than dark_all
  const tileUrl = isDarkMode
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  // Default center (US)
  const defaultCenter: [number, number] = [39.8283, -98.5795];
  const defaultZoom = 4;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Route selector header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              From:
            </label>
            <select
              value={selectedRoute?.fromId || ""}
              onChange={(e) => {
                if (e.target.value && selectedRoute?.toId) {
                  onSelectRoute({ fromId: e.target.value, toId: selectedRoute.toId });
                } else if (e.target.value && pointsOfInterest.length > 0) {
                  onSelectRoute({ fromId: e.target.value, toId: pointsOfInterest[0].id });
                }
              }}
              className="flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select location</option>
              {startingLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.nickname}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              To:
            </label>
            <select
              value={selectedRoute?.toId || ""}
              onChange={(e) => {
                if (e.target.value && selectedRoute?.fromId) {
                  onSelectRoute({ fromId: selectedRoute.fromId, toId: e.target.value });
                } else if (e.target.value && startingLocations.length > 0) {
                  onSelectRoute({ fromId: startingLocations[0].id, toId: e.target.value });
                }
              }}
              className="flex-1 sm:flex-initial px-2 sm:px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select destination</option>
              {pointsOfInterest.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.nickname}
                </option>
              ))}
            </select>
          </div>

          {routeResult && (
            <div className="flex items-center justify-center sm:justify-end gap-3 sm:gap-4 text-sm sm:ml-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {formatDuration(routeResult.durationSeconds)}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {formatDistance(routeResult.distanceMeters)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Map container */}
      <div className="h-[300px] sm:h-[400px]">
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={tileUrl}
          />

          <FitBounds
            initialBounds={initialBounds}
            routeBounds={routeBounds}
            selectedRouteKey={selectedRouteKey}
          />

          {/* Starting location markers (blue) */}
          {startingLocations.map((loc) => (
            <Marker
              key={`start-${loc.id}`}
              position={[loc.coordinates.lat, loc.coordinates.lon]}
              icon={startIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{loc.nickname}</p>
                  <p className="text-gray-600 text-xs">{loc.address}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* POI markers (green for regular, purple for find-nearest) */}
          {pointsOfInterest.flatMap((loc) => {
            // For find-nearest POIs, render ALL resolved locations
            if (loc.isFindNearest && loc.resolvedLocations) {
              return loc.resolvedLocations
                .filter(resolved => isValidCoordinates(resolved.coordinates.lat, resolved.coordinates.lon))
                .map((resolved) => {
                  // Find the starting location name for the popup
                  const startLoc = startingLocations.find(s => s.id === resolved.startingLocationId);
                  return (
                    <Marker
                      key={`poi-${loc.id}-${resolved.startingLocationId}`}
                      position={[resolved.coordinates.lat, resolved.coordinates.lon]}
                      icon={findNearestIcon}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">{loc.nickname}</p>
                          {resolved.businessName && (
                            <p className="text-purple-600 text-xs font-medium">{resolved.businessName}</p>
                          )}
                          <p className="text-gray-600 text-xs">{resolved.address}</p>
                          {startLoc && (
                            <p className="text-gray-400 text-xs mt-1">Nearest to: {startLoc.nickname}</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                });
            }

            // Regular POI - only render if valid coordinates
            if (!isValidCoordinates(loc.coordinates.lat, loc.coordinates.lon)) {
              return [];
            }

            return [
              <Marker
                key={`poi-${loc.id}`}
                position={[loc.coordinates.lat, loc.coordinates.lon]}
                icon={poiIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{loc.nickname}</p>
                    {loc.businessName && (
                      <p className="text-blue-600 text-xs font-medium">{loc.businessName}</p>
                    )}
                    <p className="text-gray-600 text-xs">{loc.address}</p>
                  </div>
                </Popup>
              </Marker>
            ];
          })}

          {/* Route polyline */}
          {routeResult && routeResult.geometry.length > 0 && (
            <Polyline
              positions={routeResult.geometry}
              pathOptions={{
                color: "#3b82f6",
                weight: 5,
                opacity: 0.8,
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-2 border-white shadow"></div>
          <span>Starting Location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-500 to-green-700 border-2 border-white shadow"></div>
          <span>Point of Interest</span>
        </div>
        {pointsOfInterest.some(p => p.isFindNearest) && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-violet-700 border-2 border-white shadow"></div>
            <span>Nearest Location</span>
          </div>
        )}
        {fromLocation && toLocation && (
          <div className="ml-auto">
            Route: {fromLocation.nickname} → {toLocation.nickname}
          </div>
        )}
      </div>
    </div>
  );
}