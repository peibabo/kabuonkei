import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";

export const alt = "株の買い時はいつ？過熱感・底値の見極め方を指標から整理";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const charSet =
    "株の買い時はいつ過熱感底値見極め方を指標から整理株温計kabuonkei解説記事センチメント需給リスクマクロ温度で掴む";
  const fonts = await buildNotoSansJpFonts(charSet);

  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(
    THERMOMETER_SVG,
  ).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)",
          fontFamily: "NotoSansJP, sans-serif",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={svgDataUri} width={64} height={64} alt="thermometer" />
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: -1,
            }}
          >
            株温計
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#475569",
              marginLeft: 8,
              marginTop: 10,
            }}
          >
            解説記事
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 80,
              fontWeight: 900,
              color: "#0f172a",
              lineHeight: 1.1,
              marginBottom: 24,
            }}
          >
            株の買い時はいつ？
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 500,
              color: "#1e293b",
              lineHeight: 1.4,
              marginBottom: 40,
            }}
          >
            過熱感・底値の見極め方を指標から整理
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 22,
              color: "#334155",
            }}
          >
            {["①センチメント", "②需給", "③リスク", "④マクロ"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  background: "white",
                  padding: "14px 20px",
                  borderRadius: 14,
                  border: "1px solid #cbd5e1",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#475569",
            borderTop: "1px solid #94a3b840",
            paddingTop: 16,
          }}
        >
          kabuonkei.com/learn/when-to-buy-stocks
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
