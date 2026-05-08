import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";

export const alt =
  "ドローダウンとは？最大DDの意味と「リターンより怖い」理由";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const charSet =
    "ドローダウンとは最大DDの意味リターンより怖い理由株温計kabuonkei解説記事過去年抑制検証パーセント";
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
            ドローダウンとは？
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
            最大DD の意味と「リターンより怖い」理由
          </div>

          <div
            style={{
              display: "flex",
              gap: 24,
              fontSize: 22,
              color: "#334155",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "16px 24px",
                borderRadius: 16,
                border: "1px solid #cbd5e1",
              }}
            >
              <span style={{ fontSize: 18, color: "#64748b" }}>
                S&P500 リーマン
              </span>
              <span
                style={{ fontSize: 36, fontWeight: 800, color: "#dc2626" }}
              >
                -56.8 %
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "16px 24px",
                borderRadius: 16,
                border: "1px solid #cbd5e1",
              }}
            >
              <span style={{ fontSize: 18, color: "#64748b" }}>
                日経225 バブル崩壊
              </span>
              <span
                style={{ fontSize: 36, fontWeight: 800, color: "#dc2626" }}
              >
                約 -80 %
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "16px 24px",
                borderRadius: 16,
                border: "1px solid #cbd5e1",
              }}
            >
              <span style={{ fontSize: 18, color: "#64748b" }}>
                温度信号の DD 抑制効果
              </span>
              <span
                style={{ fontSize: 36, fontWeight: 800, color: "#047857" }}
              >
                約 -3 pp 浅い
              </span>
            </div>
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
          kabuonkei.com/learn/what-is-drawdown
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
