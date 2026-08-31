import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function GET() {
  const size = 192;
  const mark = Math.round(size * 0.42);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#7B2CBF",
        }}
      >
        <div
          style={{
            width: mark,
            height: mark,
            background: "#FFFDFB",
            borderRadius: "50% 50% 50% 16%",
            transform: "rotate(45deg)",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
