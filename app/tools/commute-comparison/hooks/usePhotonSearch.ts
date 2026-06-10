"use client";

import { useState, useEffect, useCallback } from "react";
import { NominatimResult, Coordinates } from "../types";

interface MapboxContext {
  id: string;
  text: string;
  short_code?: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lon, lat]
  properties: {
    address?: string; // house number
  };
  context?: MapboxContext[];
}

interface MapboxResponse {
  features: MapboxFeature[];
}

function getContext(feature: MapboxFeature, prefix: string): string | undefined {
  return feature.context?.find((c) => c.id.startsWith(prefix))?.text;
}

function mapboxToNominatim(feature: MapboxFeature, index: number): NominatimResult {
  const houseNumber = feature.properties?.address;
  const street = feature.text;
  const city = getContext(feature, "place");
  const state = getContext(feature, "region");
  const postcode = getContext(feature, "postcode");
  const country = getContext(feature, "country");

  return {
    place_id: index,
    licence: "",
    osm_type: "N",
    osm_id: index,
    lat: String(feature.center[1]),
    lon: String(feature.center[0]),
    display_name: feature.place_name,
    address: {
      house_number: houseNumber,
      road: street,
      city,
      state,
      postcode,
      country,
    },
    boundingbox: ["0", "0", "0", "0"],
    name: undefined,
    type: "mapbox",
    class: "mapbox",
  };
}

interface UsePhotonSearchOptions {
  biasLocation?: Coordinates | null;
  limit?: number;
  debounceMs?: number;
}

interface UsePhotonSearchResult {
  suggestions: NominatimResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearSuggestions: () => void;
}

export function usePhotonSearch(
  options: UsePhotonSearchOptions = {}
): UsePhotonSearchResult {
  const { biasLocation = null, limit = 5, debounceMs = 300 } = options;

  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();

    const fetchSuggestions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          q: debouncedQuery,
          limit: limit.toString(),
        });

        if (biasLocation) {
          params.append("proximity", `${biasLocation.lon},${biasLocation.lat}`);
        }

        const response = await fetch(`/api/geocode?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to fetch address suggestions");

        const data: MapboxResponse = await response.json();
        setSuggestions((data.features || []).map(mapboxToNominatim));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "An error occurred");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
    return () => controller.abort();
  }, [debouncedQuery, biasLocation, limit]);

  const search = useCallback((newQuery: string) => setQuery(newQuery), []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setQuery("");
  }, []);

  return { suggestions, isLoading, error, search, clearSuggestions };
}
