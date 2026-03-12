import { PhotonFeature, NominatimResult, Coordinates, Location } from "./types";

/**
 * Format duration from seconds to human-readable minutes
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

/**
 * Format distance from meters to miles
 */
export function formatDistance(meters: number): string {
  const miles = meters * 0.000621371;
  return `${miles.toFixed(1)} mi`;
}

// State abbreviations
const STATE_ABBREVIATIONS: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
  "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
  "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
  "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
  "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
  "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
  "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
};

// Street type abbreviations
const STREET_ABBREVIATIONS: Record<string, string> = {
  "street": "St", "avenue": "Ave", "boulevard": "Blvd", "drive": "Dr",
  "road": "Rd", "lane": "Ln", "court": "Ct", "place": "Pl", "circle": "Cir",
  "highway": "Hwy", "parkway": "Pkwy", "terrace": "Ter", "way": "Way",
  "trail": "Trl", "square": "Sq", "loop": "Loop", "pike": "Pike",
};

// Direction abbreviations
const DIRECTION_ABBREVIATIONS: Record<string, string> = {
  "north": "N", "south": "S", "east": "E", "west": "W",
  "northeast": "NE", "northwest": "NW", "southeast": "SE", "southwest": "SW",
};

/**
 * Abbreviate a state name to its postal code
 */
function abbreviateState(state: string): string {
  const normalized = state.toLowerCase().trim();
  return STATE_ABBREVIATIONS[normalized] || state;
}

/**
 * Abbreviate street types and directions in a street name
 */
function abbreviateStreet(street: string): string {
  let result = street;

  // Abbreviate directions (case insensitive, word boundaries)
  for (const [full, abbr] of Object.entries(DIRECTION_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${full}\\b`, "gi");
    result = result.replace(regex, abbr);
  }

  // Abbreviate street types (case insensitive, word boundaries)
  for (const [full, abbr] of Object.entries(STREET_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${full}\\b`, "gi");
    result = result.replace(regex, abbr);
  }

  return result;
}

/**
 * Extract business name from Photon feature if it's a named place
 */
export function extractBusinessName(feature: PhotonFeature): string | undefined {
  const p = feature.properties;

  // If there's a name and it's different from the street, it's likely a business/place name
  if (p.name && p.street && p.name.toLowerCase() !== p.street.toLowerCase()) {
    return p.name;
  }

  // If there's only a name (no street), and it doesn't look like a street address
  if (p.name && !p.street && !p.housenumber) {
    return p.name;
  }

  return undefined;
}

/**
 * Extract business name from Nominatim result if it's a named place
 */
export function extractNominatimBusinessName(result: NominatimResult): string | undefined {
  // If it's a named place (shop, amenity, etc.) and has a name different from the street
  if (result.name && result.address.road && result.name.toLowerCase() !== result.address.road.toLowerCase()) {
    return result.name;
  }

  // Check the class/type to see if it's a business
  if (result.class && ["shop", "amenity", "tourism", "leisure"].includes(result.class) && result.name) {
    return result.name;
  }

  return undefined;
}

/**
 * Format a Nominatim API result into a compact, abbreviated address string
 */
export function formatNominatimAddress(result: NominatimResult): string {
  const addr = result.address;
  const parts: string[] = [];

  // Street address (abbreviated)
  if (addr.house_number && addr.road) {
    parts.push(`${addr.house_number} ${abbreviateStreet(addr.road)}`);
  } else if (addr.road) {
    parts.push(abbreviateStreet(addr.road));
  } else if (result.name) {
    // Only use name as address if no street info
    parts.push(result.name);
  }

  // City (prefer city, fall back to town or village)
  const city = addr.city || addr.town || addr.village;
  if (city) {
    parts.push(city);
  }

  // State (abbreviated) and postal code
  if (addr.state && addr.postcode) {
    parts.push(`${abbreviateState(addr.state)} ${addr.postcode}`);
  } else if (addr.state) {
    parts.push(abbreviateState(addr.state));
  } else if (addr.postcode) {
    parts.push(addr.postcode);
  }

  return parts.join(", ");
}

/**
 * Format a Photon API result into a compact, abbreviated address string
 */
export function formatPhotonAddress(feature: PhotonFeature): string {
  const p = feature.properties;
  const parts: string[] = [];

  // Street address (abbreviated)
  if (p.housenumber && p.street) {
    parts.push(`${p.housenumber} ${abbreviateStreet(p.street)}`);
  } else if (p.street) {
    parts.push(abbreviateStreet(p.street));
  } else if (p.name) {
    // Only use name as address if no street info
    parts.push(p.name);
  }

  // City
  if (p.city) {
    parts.push(p.city);
  }

  // State (abbreviated) and postal code
  if (p.state && p.postcode) {
    parts.push(`${abbreviateState(p.state)} ${p.postcode}`);
  } else if (p.state) {
    parts.push(abbreviateState(p.state));
  } else if (p.postcode) {
    parts.push(p.postcode);
  }

  return parts.join(", ");
}

/**
 * Decode an encoded polyline string (Google's Polyline Algorithm Format)
 * Used by OpenRouteService for route geometry
 * Returns array of [lat, lon] pairs
 */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  while (index < encoded.length) {
    // Decode latitude
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    // Decode longitude
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLon = result & 1 ? ~(result >> 1) : result >> 1;
    lon += deltaLon;

    points.push([lat / 1e5, lon / 1e5]);
  }

  return points;
}

/**
 * Calculate the center point of all locations for search bias
 */
export function calculateCenterPoint(locations: Location[]): Coordinates | null {
  if (locations.length === 0) return null;

  const avgLat =
    locations.reduce((sum, l) => sum + l.coordinates.lat, 0) / locations.length;
  const avgLon =
    locations.reduce((sum, l) => sum + l.coordinates.lon, 0) / locations.length;

  return { lat: avgLat, lon: avgLon };
}

/**
 * Generate a unique ID for locations
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistanceMeters(from: Coordinates, to: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLon = ((to.lon - from.lon) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert miles to degrees (approximate, for viewbox calculation)
 * 1 degree latitude ~ 69 miles
 */
export function milesToDegrees(miles: number): number {
  return miles / 69;
}

/**
 * Create a Nominatim viewbox string around coordinates
 * Format: left,top,right,bottom (lon,lat,lon,lat)
 */
export function createViewbox(center: Coordinates, radiusMiles: number): string {
  const delta = milesToDegrees(radiusMiles);
  return `${center.lon - delta},${center.lat + delta},${center.lon + delta},${center.lat - delta}`;
}

/**
 * Calculate bounds that fit all locations and a route
 */
export function calculateBounds(
  locations: Location[],
  routeGeometry?: [number, number][]
): [[number, number], [number, number]] | null {
  const allPoints: [number, number][] = [];

  // Add location coordinates
  for (const loc of locations) {
    allPoints.push([loc.coordinates.lat, loc.coordinates.lon]);
  }

  // Add route geometry points
  if (routeGeometry) {
    allPoints.push(...routeGeometry);
  }

  if (allPoints.length === 0) return null;

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

  // Add some padding
  const latPadding = (maxLat - minLat) * 0.1 || 0.01;
  const lonPadding = (maxLon - minLon) * 0.1 || 0.01;

  return [
    [minLat - latPadding, minLon - lonPadding],
    [maxLat + latPadding, maxLon + lonPadding],
  ];
}

/**
 * Extract street number and street name from a full address
 * e.g., "123 Main Street NE, Knoxville, TN 37917" → "123 Main St NE"
 */
export function extractStreetAddress(fullAddress: string): string {
  // Split by comma to get the street part (first segment)
  const parts = fullAddress.split(",");
  if (parts.length === 0) return fullAddress;

  let streetPart = parts[0].trim();

  // Apply street abbreviations
  for (const [full, abbrev] of Object.entries(STREET_ABBREVIATIONS)) {
    // Match word boundary to avoid partial replacements
    const regex = new RegExp(`\\b${full}\\b`, "gi");
    streetPart = streetPart.replace(regex, abbrev);
  }

  return streetPart;
}

/**
 * Format weekly commute time from total seconds
 * Returns a compact string like "2.5 hrs" or "45 min"
 */
export function formatWeeklyTime(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes >= 60) {
    const hours = totalMinutes / 60;
    return `${hours.toFixed(1)} hrs`;
  }
  return `${totalMinutes} min`;
}
