export interface Coordinates {
  lat: number;
  lon: number;
}

// Resolved location for find-nearest POIs (one per starting location)
export interface ResolvedLocation {
  startingLocationId: string;
  address: string;
  businessName?: string;
  coordinates: Coordinates;
}

export interface Location {
  id: string;
  nickname: string;
  address: string;
  businessName?: string; // Optional business/place name if different from address
  coordinates: Coordinates;
  // Find-Nearest mode fields (only for POIs)
  isFindNearest?: boolean; // true if this is a "find nearest" POI
  searchQuery?: string; // e.g., "Publix", "Starbucks"
  resolvedLocations?: ResolvedLocation[]; // resolved per starting location
  // Weekly trip frequency (only for POIs)
  tripsPerWeek?: number; // e.g., 5 for daily work commute, 2 for gym
}

export interface PhotonFeature {
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    osm_id?: number;
  };
}

export interface PhotonResponse {
  features: PhotonFeature[];
}

// Nominatim types
export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox: [string, string, string, string];
  name?: string;
  type?: string;
  class?: string;
}

export interface RouteResult {
  fromId: string;
  toId: string;
  durationSeconds: number;
  distanceMeters: number;
  geometry: [number, number][]; // decoded polyline as [lat, lon] pairs
}

export interface CommuteMatrix {
  [startingLocationId: string]: {
    [poiId: string]: RouteResult | null;
  };
}

export interface SelectedRoute {
  fromId: string;
  toId: string;
}
