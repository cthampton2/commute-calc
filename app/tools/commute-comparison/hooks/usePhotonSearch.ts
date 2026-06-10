"use client";

import { useState, useEffect, useCallback } from "react";
import { NominatimResult, PhotonFeature, PhotonResponse, Coordinates } from "../types";

const PHOTON_BASE_URL = "https://photon.komoot.io/api/";

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

function photonToNominatim(feature: PhotonFeature, index: number): NominatimResult {
  const p = feature.properties;
  const streetPart =
    p.housenumber && p.street
      ? `${p.housenumber} ${p.street}`
      : p.street || "";
  const parts = [streetPart, p.city, p.state, p.postcode].filter(Boolean);
  const displayName = p.name ? `${p.name}, ${parts.join(", ")}` : parts.join(", ");

  return {
    place_id: p.osm_id || index,
    licence: "",
    osm_type: "N",
    osm_id: p.osm_id || index,
    lat: String(feature.geometry.coordinates[1]),
    lon: String(feature.geometry.coordinates[0]),
    display_name: displayName,
    address: {
      house_number: p.housenumber,
      road: p.street,
      city: p.city,
      state: p.state,
      postcode: p.postcode,
      country: p.country,
    },
    boundingbox: ["0", "0", "0", "0"],
    name: p.name,
    type: "photon",
    class: "photon",
  };
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
          lang: "en",
        });

        if (biasLocation) {
          params.append("lat", String(biasLocation.lat));
          params.append("lon", String(biasLocation.lon));
        }

        const response = await fetch(`${PHOTON_BASE_URL}?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error("Failed to fetch address suggestions");

        const data: PhotonResponse = await response.json();
        const mapped = (data.features || []).map(photonToNominatim);
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
  }, [debouncedQuery, biasLocation, limit]);

  const search = useCallback((newQuery: string) => setQuery(newQuery), []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setQuery("");
  }, []);

  return { suggestions, isLoading, error, search, clearSuggestions };
}
