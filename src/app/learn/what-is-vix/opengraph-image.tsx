import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import { getVixSp500Analysis } from "@/lib/vix-sp500-analysis";

export const alt =
  "VIX（恐怖指数）とは？S&P500 の不安心理を測る指標を初心者向けに解説";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const analysis = getVixSp500Analysis();
  const high = analysis.primary.bands.find((b) => b.band === "30〜");

  const charSet =
    "VIX恐怖指数とはSP超え過去年データ検証日後株温計買い場kabuonkei解説記事勝率平均";
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
            "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)",
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
            VIX（恐怖指数）とは？
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 500,
              color: "#1e293b",
              lineHeight: 1.4,
              marginBottom: 40,
            }}
          >
            S&P500 の不安心理を測る指標を初心者向けに解説
          </div>

          {high && (
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
                  VIX 30 超えの後の S&P500（6ヶ月後）
                </span>
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    color: "#047857",
                  }}
                >
                  +{high.sp500["6m"].avgReturn.toFixed(1)}% / 勝率{" "}
                  {high.sp500["6m"].winRate.toFixed(0)}%
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
                  集計サンプル数
                </span>
                <span
                  style={{ fontSize: 40, fontWeight: 800, color: "#0f172a" }}
                >
                  {analysis.sampleSize.toLocaleString()} 取引日
                </span>
              </div>
            </div>
          )}
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
          kabuonkei.com/learn/what-is-vix
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
