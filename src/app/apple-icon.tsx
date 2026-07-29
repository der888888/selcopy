import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 78,
            height: 92,
            background: "#fffcf7",
            borderRadius: 10,
            padding: "16px 14px",
            gap: 10,
            boxShadow: "6px 6px 0 #d97706",
          }}
        >
          <div style={{ height: 10, width: 50, background: "#0f7a5f", borderRadius: 4 }} />
          <div style={{ height: 8, width: 42, background: "#9bb5a8", borderRadius: 4 }} />
          <div style={{ height: 8, width: 46, background: "#9bb5a8", borderRadius: 4 }} />
          <div style={{ height: 8, width: 34, background: "#d97706", borderRadius: 4 }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
