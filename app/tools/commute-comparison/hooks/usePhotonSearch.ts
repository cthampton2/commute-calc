"use client";

import { useState, useEffect, useCallback } from "react";
import { NominatimResult, Coordinates } from "../types";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

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

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Fetch suggestions when debounced query changes
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
          format: "json",
          addressdetails: "1",
          limit: limit.toString(),
          countrycodes: "us",
        });

        // Add viewbox bias if location is available (prioritizes results near this location)
        if (biasLocation) {
          const delta = 0.5; // ~50km radius
          params.append(
            "viewbox",
            `${biasLocation.lon - delta},${biasLocation.lat + delta},${biasLocation.lon + delta},${biasLocation.lat - delta}`
          );
          params.append("bounded", "0"); // Don't strictly limit to viewbox, just bias
        }

        const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            "User-Agent": "RealEstateToolkit/1.0",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch address suggestions");
        }

        const data: NominatimResult[] = await response.json();
        setSuggestions(data || []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Ignore aborted requests
        }
        setError(err instanceof Error ? err.message : "An error occurred");
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();

    return () => controller.abort();
  }, [debouncedQuery, biasLocation, limit]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setQuery("");
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    search,
    clearSuggestions,
  };
}
