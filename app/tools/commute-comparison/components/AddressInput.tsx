"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePhotonSearch } from "../hooks/usePhotonSearch";
import { NominatimResult, Coordinates, Location } from "../types";
import { formatNominatimAddress, extractNominatimBusinessName, generateId, createViewbox } from "../utils";
import { AnalyticsEvents } from "@/app/lib/analytics";

type InputMode = "address" | "findNearest";

interface AddressInputProps {
  onAdd: (location: Location) => void;
  biasLocation?: Coordinates | null;
  placeholder?: {
    nickname: string;
    address: string;
  };
  enableFindNearest?: boolean;
  findNearestDisabled?: boolean;
  findNearestDisabledReason?: string;
  accentColor?: "blue" | "emerald";
}

interface ValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  matchCount: number;
  errorMessage?: string;
}

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const FIND_NEAREST_RADIUS_MILES = 10;

export default function AddressInput({
  onAdd,
  biasLocation = null,
  placeholder = { nickname: "e.g., Home", address: "Search for an address..." },
  enableFindNearest = false,
  findNearestDisabled = false,
  findNearestDisabledReason = "Limit reached",
  accentColor = "blue",
}: AddressInputProps) {
  const [mode, setMode] = useState<InputMode>("address");
  const [nickname, setNickname] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<{
    address: string;
    businessName?: string;
    coordinates: Coordinates;
  } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [validation, setValidation] = useState<ValidationState>({
    isValidating: false,
    isValid: null,
    matchCount: 0,
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { suggestions, isLoading, search, clearSuggestions } = usePhotonSearch({
    biasLocation,
    limit: 5,
    debounceMs: 300,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateBusinessName = useCallback(async (query: string) => {
    if (!query.trim() || !biasLocation) {
      setValidation({ isValidating: false, isValid: null, matchCount: 0 });
      return;
    }
    setValidation({ isValidating: true, isValid: null, matchCount: 0 });
    try {
      const viewbox = createViewbox(biasLocation, FIND_NEAREST_RADIUS_MILES);
      const params = new URLSearchParams({
        q: query.trim(),
        format: "json",
        limit: "5",
        countrycodes: "us",
        viewbox,
        bounded: "1",
      });
      const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`, {
        headers: { "User-Agent": "RealEstateToolkit/1.0" },
      });
      if (!response.ok) {
        setValidation({ isValidating: false, isValid: false, matchCount: 0, errorMessage: "Search failed" });
        return;
      }
      const results: NominatimResult[] = await response.json();
      if (results.length > 0) {
        setValidation({ isValidating: false, isValid: true, matchCount: results.length });
      } else {
        setValidation({ isValidating: false, isValid: false, matchCount: 0, errorMessage: `No "${query}" found within 10 miles` });
      }
    } catch {
      setValidation({ isValidating: false, isValid: false, matchCount: 0, errorMessage: "Search failed" });
    }
  }, [biasLocation]);

  useEffect(() => {
    if (mode !== "findNearest") return;
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    if (!searchQuery.trim()) {
      setValidation({ isValidating: false, isValid: null, matchCount: 0 });
      return;
    }
    validationTimeoutRef.current = setTimeout(() => validateBusinessName(searchQuery), 500);
    return () => { if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current); };
  }, [searchQuery, mode, validateBusinessName]);

  const handleModeChange = (newMode: InputMode) => {
    if (newMode === "findNearest" && findNearestDisabled) return;
    setMode(newMode);
    setNickname("");
    setAddressQuery("");
    setSearchQuery("");
    setSelectedAddress(null);
    setValidation({ isValidating: false, isValid: null, matchCount: 0 });
    clearSuggestions();
  };

  const handleAddressChange = (value: string) => {
    setAddressQuery(value);
    setSelectedAddress(null);
    search(value);
    setShowDropdown(true);
  };

  const handleSelectSuggestion = (result: NominatimResult) => {
    const address = formatNominatimAddress(result);
    const businessName = extractNominatimBusinessName(result);
    const coordinates: Coordinates = { lat: parseFloat(result.lat), lon: parseFloat(result.lon) };
    AnalyticsEvents.searchAddress();
    setAddressQuery(businessName ? `${businessName} - ${address}` : address);
    setSelectedAddress({ address, businessName, coordinates });
    setShowDropdown(false);
    clearSuggestions();
  };

  const handleAdd = () => {
    if (mode === "address") {
      if (!nickname.trim() || !selectedAddress) return;
      onAdd({
        id: generateId(),
        nickname: nickname.trim(),
        address: selectedAddress.address,
        businessName: selectedAddress.businessName,
        coordinates: selectedAddress.coordinates,
      });
    } else {
      if (!nickname.trim() || !searchQuery.trim() || !validation.isValid) return;
      onAdd({
        id: generateId(),
        nickname: nickname.trim(),
        address: `Nearest: ${searchQuery.trim()}`,
        coordinates: { lat: 0, lon: 0 },
        isFindNearest: true,
        searchQuery: searchQuery.trim(),
      });
    }
    setNickname("");
    setAddressQuery("");
    setSearchQuery("");
    setSelectedAddress(null);
    setValidation({ isValidating: false, isValid: null, matchCount: 0 });
    clearSuggestions();
  };

  const isValid =
    mode === "address"
      ? nickname.trim() && selectedAddress
      : nickname.trim() && searchQuery.trim() && validation.isValid === true;

  const accentFocus = accentColor === "emerald"
    ? "focus:border-emerald-500 focus:ring-emerald-500/20"
    : "focus:border-blue-500 focus:ring-blue-500/20";

  const addButtonClass = isValid
    ? mode === "findNearest"
      ? "bg-violet-600 hover:bg-violet-500 text-white"
      : accentColor === "emerald"
        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
        : "bg-blue-600 hover:bg-blue-500 text-white"
    : "bg-slate-800 text-slate-600 cursor-not-allowed";

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      {enableFindNearest && (
        <div className="flex gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => handleModeChange("address")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              mode === "address"
                ? "bg-slate-700 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Address
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("findNearest")}
            disabled={findNearestDisabled}
            title={findNearestDisabled ? findNearestDisabledReason : "Find nearest business"}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition ${
              mode === "findNearest"
                ? "bg-violet-900/60 text-violet-300 border border-violet-700/50"
                : findNearestDisabled
                ? "text-slate-700 cursor-not-allowed"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find Nearest
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        {/* Nickname */}
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={mode === "findNearest" ? "e.g., Grocery" : placeholder.nickname}
          className={`w-24 shrink-0 px-2.5 py-2 text-sm rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${accentFocus} transition`}
        />

        {mode === "address" ? (
          <div className="relative flex-1 min-w-0" ref={dropdownRef}>
            <input
              ref={inputRef}
              type="text"
              value={addressQuery}
              onChange={(e) => handleAddressChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder={placeholder.address}
              className={`w-full px-2.5 py-2 text-sm rounded-lg border bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition ${
                selectedAddress
                  ? "border-emerald-600/60"
                  : `border-slate-700 ${accentFocus}`
              }`}
            />
            {isLoading && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-700 max-h-52 overflow-y-auto">
                {suggestions.map((result, index) => {
                  const address = formatNominatimAddress(result);
                  const businessName = extractNominatimBusinessName(result);
                  return (
                    <button
                      key={`${result.osm_id || index}-${index}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(result)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-700 border-b border-slate-700/50 last:border-b-0 transition"
                    >
                      {businessName && <span className="block text-xs font-medium text-white truncate">{businessName}</span>}
                      <span className={`block truncate ${businessName ? "text-[10px] text-slate-400" : "text-xs text-white"}`}>{address}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex-1 min-w-0">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3.5 h-3.5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., Starbucks, Planet Fitness…"
              className={`w-full pl-8 pr-8 py-2 text-sm rounded-lg border bg-slate-900 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/20 transition ${
                !searchQuery.trim() ? "border-violet-700/40" :
                validation.isValidating ? "border-amber-500/60" :
                validation.isValid === true ? "border-emerald-600/60" :
                validation.isValid === false ? "border-red-600/60" :
                "border-violet-700/40"
              }`}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {validation.isValidating && (
                <svg className="animate-spin h-3.5 w-3.5 text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {!validation.isValidating && validation.isValid === true && (
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {!validation.isValidating && validation.isValid === false && (
                <svg className="h-3.5 w-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Add button */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!isValid}
          className={`shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition ${addButtonClass}`}
        >
          Add
        </button>
      </div>

      {/* Find-nearest validation hint */}
      {mode === "findNearest" && (
        <p className={`text-[11px] px-0.5 ${
          validation.isValid === true ? "text-emerald-500" :
          validation.isValid === false ? "text-red-400" :
          validation.isValidating ? "text-amber-500" :
          "text-slate-600"
        }`}>
          {validation.isValid === true
            ? `Found ${validation.matchCount} match${validation.matchCount !== 1 ? "es" : ""} for "${searchQuery}" nearby`
            : validation.isValid === false && validation.errorMessage
            ? validation.errorMessage
            : validation.isValidating
            ? `Searching for "${searchQuery}"…`
            : "We'll find the nearest one to each home when you calculate."}
        </p>
      )}
    </div>
  );
}
