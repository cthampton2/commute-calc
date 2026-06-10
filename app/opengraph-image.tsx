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
        {/* Gradient accent */}
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
