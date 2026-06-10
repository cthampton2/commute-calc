import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CommuteCalc — Compare Commute Times";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#020617",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 80px",
          position: "relative",
        }}
      >
        {/* Gradient accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(to right, #3b82f6, #7c3aed)",
          }}
        />

        {/* Map pin icon */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 20 }}
        >
          <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>

        <p
          style={{
            color: "#60a5fa",
            fontSize: 20,
            fontFamily: "monospace",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 28,
            margin: "0 0 28px 0",
          }}
        >
          Free Commute Map Calculator
        </p>

        <h1
          style={{
            color: "white",
            fontSize: 68,
            fontWeight: 900,
            lineHeight: 1.05,
            margin: "0 0 32px 0",
            maxWidth: 800,
          }}
        >
          Before you sign,{" "}
          <span style={{ color: "#818cf8" }}>know your commute.</span>
        </h1>

        <p
          style={{
            color: "#94a3b8",
            fontSize: 26,
            margin: "0 0 0 0",
            maxWidth: 680,
            lineHeight: 1.5,
          }}
        >
          Compare driving times from multiple homes to work — side-by-side on
          an interactive map.
        </p>

        <p
          style={{
            color: "#334155",
            fontSize: 22,
            position: "absolute",
            bottom: 56,
            right: 80,
            margin: 0,
          }}
        >
          commutecalc.com
        </p>
      </div>
    ),
    { ...size }
  );
}
