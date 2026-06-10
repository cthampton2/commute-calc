import { NextRequest, NextResponse } from "next/server";

const MAPBOX_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";

// Guardrail: 20 requests per minute per IP
// In-memory — resets on cold start, adequate as first-line abuse defense
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;

  entry.count++;
  return false;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const proximity = searchParams.get("proximity"); // "lon,lat" optional

  if (!q || q.length < 2 || q.length > 256) {
    return NextResponse.json({ features: [] });
  }

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Geocoding service not configured" },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    access_token: token,
    limit: "5",
    country: "us",
    types: "address",
    language: "en",
  });

  if (proximity) params.append("proximity", proximity);

  try {
    const url = `${MAPBOX_BASE}/${encodeURIComponent(q)}.json?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ features: [] }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ features: [] }, { status: 500 });
  }
}
