"use client";

import { useState, useEffect, useCallback } from "react";
import { NominatimResult, Coordinates } from "../types";

const GEOCODIO_BASE_URL = "https://api.geocod.io/v1.7/autocomplete";

interface GeocodioAddressComponents {
  number?: string;
  predirectional?: string;
  street?: string;
  suffix?: string;
  postdirectional?: string;
  formatted_street?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface GeocodioResult {
  address_components: GeocodioAddressComponents;
  formatted_address: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface GeocodioResponse {
  results: GeocodioResult[];
}

function geocodioToNominatim(result: GeocodioResult, index: number): NominatimResult {
  const c = result.address_components;
  return {
    place_id: index,
    licence: "",
    osm_type: "N",
    osm_id: index,
    lat: String(result.location?.lat ?? 0),
    lon: String(result.location?.lng ?? 0),
    display_name: result.formatted_address,
    address: {
      house_number: c.number,
      road: c.formatted_street,
      city: c.city,
      state: c.state,
      postcode: c.zip,
      country: c.country,
    },
    boundingbox: ["0", "0", "0", "0"],
    name: undefined,
    type: "geocodio",
    class: "geocodio",
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
  const { limit = 5, debounceMs = 300 } = options;

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
          api_key: process.env.NEXT_PUBLIC_GEOCODIO_API_KEY ?? "",
          limit: limit.toString(),
          country: "us",
        });

        const response = await fetch(`${GEOCODIO_BASE_URL}?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to fetch address suggestions");

        const data: GeocodioResponse = await response.json();
        const mapped = (data.results || []).map(geocodioToNominatim);
        setSuggestions(mapped);
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
  }, [debouncedQuery, limit]);

  const search = useCallback((newQuery: string) => setQuery(newQuery), []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setQuery("");
  }, []);

  return { suggestions, isLoading, error, search, clearSuggestions };
}
