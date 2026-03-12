"use client";

import { useState } from "react";
import { Location, Coordinates, NominatimResult } from "../types";
import AddressInput from "./AddressInput";
import { usePhotonSearch } from "../hooks/usePhotonSearch";
import { formatNominatimAddress, extractNominatimBusinessName } from "../utils";

interface LocationListProps {
  title: string;
  locations: Location[];
  onAdd: (location: Location) => void;
  onUpdate: (id: string, location: Partial<Location>) => void;
  onDelete: (id: string) => void;
  biasLocation?: Coordinates | null;
  emptyMessage?: string;
  placeholder?: { nickname: string; address: string };
  enableFindNearest?: boolean;
  findNearestCount?: number;
  maxFindNearest?: number;
  accentColor?: "blue" | "emerald";
}

interface EditingState {
  id: string;
  nickname: string;
  addressQuery: string;
  selectedCoordinates: Coordinates | null;
  selectedAddress: string | null;
  selectedBusinessName?: string;
  isFindNearest?: boolean;
  searchQuery?: string;
  tripsPerWeek?: number;
}

export default function LocationList({
  title,
  locations,
  onAdd,
  onUpdate,
  onDelete,
  biasLocation = null,
  emptyMessage = "No locations added yet",
  placeholder,
  enableFindNearest = false,
  findNearestCount = 0,
  maxFindNearest = 1,
  accentColor = "blue",
}: LocationListProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const { suggestions, isLoading, search, clearSuggestions } = usePhotonSearch({ biasLocation, limit: 5 });

  const findNearestDisabled = findNearestCount >= maxFindNearest;

  const accentBar = accentColor === "emerald"
    ? "bg-emerald-500"
    : "bg-blue-500";

  const startEditing = (location: Location) => {
    if (location.isFindNearest) {
      setEditing({ id: location.id, nickname: location.nickname, addressQuery: "", selectedCoordinates: null, selectedAddress: null, isFindNearest: true, searchQuery: location.searchQuery || "", tripsPerWeek: location.tripsPerWeek });
    } else {
      setEditing({ id: location.id, nickname: location.nickname, addressQuery: location.businessName ? `${location.businessName} - ${location.address}` : location.address, selectedCoordinates: location.coordinates, selectedAddress: location.address, selectedBusinessName: location.businessName, tripsPerWeek: location.tripsPerWeek });
    }
    clearSuggestions();
  };

  const cancelEditing = () => { setEditing(null); setShowDropdown(false); clearSuggestions(); };

  const saveEditing = () => {
    if (!editing || !editing.nickname.trim()) return;
    if (editing.isFindNearest) {
      if (!editing.searchQuery?.trim()) return;
      onUpdate(editing.id, { nickname: editing.nickname.trim(), searchQuery: editing.searchQuery.trim(), address: `Nearest: ${editing.searchQuery.trim()}`, tripsPerWeek: editing.tripsPerWeek });
    } else {
      if (!editing.selectedAddress) return;
      onUpdate(editing.id, { nickname: editing.nickname.trim(), address: editing.selectedAddress, businessName: editing.selectedBusinessName, coordinates: editing.selectedCoordinates!, tripsPerWeek: editing.tripsPerWeek });
    }
    setEditing(null); setShowDropdown(false); clearSuggestions();
  };

  const handleEditAddressChange = (value: string) => {
    if (!editing) return;
    setEditing({ ...editing, addressQuery: value, selectedAddress: null, selectedCoordinates: null });
    search(value); setShowDropdown(true);
  };

  const handleSelectEditSuggestion = (result: NominatimResult) => {
    if (!editing) return;
    const address = formatNominatimAddress(result);
    const businessName = extractNominatimBusinessName(result);
    setEditing({ ...editing, addressQuery: businessName ? `${businessName} - ${address}` : address, selectedAddress: address, selectedBusinessName: businessName, selectedCoordinates: { lat: parseFloat(result.lat), lon: parseFloat(result.lon) } });
    setShowDropdown(false); clearSuggestions();
  };

  return (
    <div className="space-y-3">
      {/* Add input */}
      <AddressInput
        onAdd={onAdd}
        biasLocation={biasLocation}
        placeholder={placeholder}
        enableFindNearest={enableFindNearest}
        findNearestDisabled={findNearestDisabled}
        findNearestDisabledReason={`Maximum ${maxFindNearest} Find Nearest POI allowed`}
        accentColor={accentColor}
      />

      {/* Location list */}
      {locations.length === 0 ? (
        <p className="text-sm text-slate-600 py-3 px-1">{emptyMessage}</p>
      ) : (
        <div className="space-y-2 mt-1">
          {locations.map((location) => (
            <div
              key={location.id}
              className="flex items-stretch gap-0 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 group"
            >
              {/* Color accent bar */}
              <div className={`w-1 flex-shrink-0 ${location.isFindNearest ? "bg-violet-500" : accentBar}`} />

              {editing?.id === location.id ? (
                /* Edit mode */
                <div className="flex-1 flex items-center gap-2 px-3 py-2 flex-wrap">
                  <input
                    type="text"
                    value={editing.nickname}
                    onChange={(e) => setEditing({ ...editing, nickname: e.target.value })}
                    className="w-20 px-2 py-1.5 text-sm rounded-md border border-slate-700 bg-slate-800 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  {editing.isFindNearest ? (
                    <div className="flex-1 relative min-w-0">
                      <input
                        type="text"
                        value={editing.searchQuery || ""}
                        onChange={(e) => setEditing({ ...editing, searchQuery: e.target.value })}
                        placeholder="Business name…"
                        className="w-full pl-2 pr-2 py-1.5 text-sm rounded-md border border-violet-700/60 bg-slate-800 text-white focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                      />
                    </div>
                  ) : (
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        value={editing.addressQuery}
                        onChange={(e) => handleEditAddressChange(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                        className={`w-full px-2 py-1.5 text-sm rounded-md border bg-slate-800 text-white focus:ring-1 focus:border-blue-500 focus:ring-blue-500 outline-none ${editing.selectedAddress ? "border-emerald-600/60" : "border-slate-700"}`}
                      />
                      {isLoading && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <svg className="animate-spin h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                      )}
                      {showDropdown && suggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-700 max-h-48 overflow-y-auto">
                          {suggestions.map((result, index) => {
                            const address = formatNominatimAddress(result);
                            const businessName = extractNominatimBusinessName(result);
                            return (
                              <button
                                key={`edit-${result.osm_id || index}-${index}`}
                                type="button"
                                onClick={() => handleSelectEditSuggestion(result)}
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
                  )}
                  {enableFindNearest && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min="0" max="14"
                        value={editing.tripsPerWeek || ""}
                        onChange={(e) => setEditing({ ...editing, tripsPerWeek: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="#"
                        className="w-10 px-1 py-1.5 text-xs text-center rounded-md border border-amber-700/50 bg-slate-800 text-white focus:ring-1 focus:ring-amber-500 outline-none"
                        title="Trips per week"
                      />
                      <span className="text-[10px] text-slate-500">/wk</span>
                    </div>
                  )}
                  <button onClick={saveEditing} disabled={!editing.nickname.trim() || (editing.isFindNearest ? !editing.searchQuery?.trim() : !editing.selectedAddress)} className="p-1.5 text-emerald-400 hover:bg-emerald-950/40 rounded transition disabled:opacity-30 disabled:cursor-not-allowed">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </button>
                  <button onClick={cancelEditing} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                /* View mode */
                <div className="flex-1 flex items-center gap-3 px-3 py-2.5 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{location.nickname}</p>
                      {location.isFindNearest && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-950/60 text-violet-300 border border-violet-800/40 flex-shrink-0">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          nearest
                        </span>
                      )}
                    </div>
                    {location.isFindNearest ? (
                      <p className="text-xs text-violet-400 truncate">{location.searchQuery}</p>
                    ) : (
                      <>
                        {location.businessName && <p className="text-xs text-slate-400 truncate">{location.businessName}</p>}
                        <p className="text-xs text-slate-500 truncate">{location.address}</p>
                      </>
                    )}
                    {location.tripsPerWeek && (
                      <p className="text-[10px] text-amber-500/80 mt-0.5">{location.tripsPerWeek}×/week</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => startEditing(location)} className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-700/60 rounded transition" title="Edit">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => onDelete(location.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/30 rounded transition" title="Delete">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
