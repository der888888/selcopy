import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f7a5f",
          borderRadius: 8,
        }}
      >
        {/* document card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 16,
            height: 18,
            background: "#fffcf7",
            borderRadius: 2,
            padding: "3px 2px",
            gap: 2,
            boxShadow: "1px 1px 0 #d97706",
          }}
        >
          <div style={{ height: 2, width: 12, background: "#0f7a5f", borderRadius: 1 }} />
          <div style={{ height: 1.5, width: 10, background: "#9bb5a8", borderRadius: 1 }} />
          <div style={{ height: 1.5, width: 11, background: "#9bb5a8", borderRadius: 1 }} />
          <div style={{ height: 1.5, width: 8, background: "#d97706", borderRadius: 1 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
