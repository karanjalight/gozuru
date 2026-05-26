import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Gozuru preview showing curated local experiences for curious travelers";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #052e22 0%, #0f5132 45%, #d8a63a 100%)",
          color: "#fffdf3",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "radial-gradient(circle at 82% 18%, rgba(255,255,255,0.22), transparent 26%), radial-gradient(circle at 16% 88%, rgba(255,220,120,0.22), transparent 28%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 72,
            right: 80,
            width: 470,
            height: 410,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 36,
              width: 250,
              height: 170,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 24,
              borderRadius: 32,
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))",
              color: "#123524",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700 }}>Hidden gems</div>
            <div style={{ marginTop: 8, fontSize: 18, color: "#4a5f52" }}>
              Local stories
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              top: 110,
              left: 0,
              width: 290,
              height: 210,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 28,
              borderRadius: 36,
              background:
                "linear-gradient(145deg, #f6c760 0%, #e88f3d 45%, #7a4121 100%)",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              Expert-led trips
            </div>
            <div style={{ marginTop: 10, fontSize: 19, opacity: 0.86 }}>
              Real people. Real places.
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 300,
              height: 190,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 28,
              borderRadius: 36,
              background:
                "linear-gradient(145deg, #2d7c5c 0%, #174937 62%, #082b21 100%)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700 }}>
              Book experiences
            </div>
            <div style={{ marginTop: 10, fontSize: 18, opacity: 0.8 }}>
              Built for curious travelers
            </div>
          </div>
        </div>

        <div
          style={{
            width: 650,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingLeft: 78,
            paddingTop: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 34,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                display: "flex",
                borderRadius: 999,
                background: "#f2c14e",
              }}
            />
            GOZURU
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 82,
              lineHeight: 0.94,
              fontWeight: 800,
              letterSpacing: -3,
            }}
          >
            Reward Your
            <br />
            Curiosity
          </div>

          <div
            style={{
              marginTop: 30,
              display: "flex",
              width: 560,
              fontSize: 30,
              lineHeight: 1.28,
              color: "rgba(255,253,243,0.86)",
            }}
          >
            Connect with local experts and discover experiences beyond the
            guidebook.
          </div>

          <div
            style={{
              marginTop: 42,
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 22,
              color: "rgba(255,253,243,0.82)",
            }}
          >
            <div
              style={{
                width: 42,
                height: 2,
                display: "flex",
                background: "#f2c14e",
              }}
            />
            Local insight, culture, food, craft, and adventure
          </div>
        </div>
      </div>
    ),
    size,
  );
}
