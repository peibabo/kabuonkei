import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import { getDivergenceAnalysis } from "@/lib/divergence-analysis";

export const alt =
  "日本だけ熱い・米国は冷静——日米温度の乖離が ±20 を超えた日、その後の日経225 と S&P500 はどう動いたか？";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const analysis = getDivergenceAnalysis();
  const latest = analysis.latestContext;
  const jpHotBand = analysis.primary.bands.find(
    (b) => b.band === "日本が大幅優位 (≥ +20)"
  );
  const jpHot3m = jpHotBand?.nikkei225["3m"];

  const charSet =
    "日米温度差乖離日本だけ熱い米国は冷静過去年検証日経225株温計分析記事最新の温度差現在月後平均サンプル取引日勝率0123456789+-≥%kabuonkei.com/analysis/-divergencetempura";
  const fonts = await buildNotoSansJpFonts(charSet);

  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(
    THERMOMETER_SVG,
  ).toString("base64")}`;

  const gapSign = latest.gap >= 0 ? "+" : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #fff7ed 0%, #fed7aa 45%, #fdba74 100%)",
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
              color: "#7c2d12",
              letterSpacing: -1,
            }}
          >
            株温計
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#9a3412",
              marginLeft: 8,
              marginTop: 10,
            }}
          >
            分析記事
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
              fontSize: 56,
              fontWeight: 900,
              color: "#7c2d12",
              lineHeight: 1.15,
              marginBottom: 24,
            }}
          >
            日本だけ熱い・米国は冷静——
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 500,
              color: "#7c2d12",
              lineHeight: 1.4,
              marginBottom: 36,
            }}
          >
            {jpHot3m && (
              <>
                乖離 ≥ +20 の 3ヶ月後、日経225 平均{" "}
                {jpHot3m.avgReturn >= 0 ? "+" : ""}
                {jpHot3m.avgReturn.toFixed(1)}% / 勝率{" "}
                {jpHot3m.winRate.toFixed(0)}%
              </>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 20,
              fontSize: 22,
              color: "#334155",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "14px 22px",
                borderRadius: 16,
                border: "1px solid #fdba74",
              }}
            >
              <span style={{ fontSize: 16, color: "#7c2d12" }}>
                最新の日本温度
              </span>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#7c2d12" }}>
                {latest.jpScore}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "14px 22px",
                borderRadius: 16,
                border: "1px solid #fdba74",
              }}
            >
              <span style={{ fontSize: 16, color: "#7c2d12" }}>
                最新の米国温度
              </span>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#7c2d12" }}>
                {latest.usScore}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "14px 22px",
                borderRadius: 16,
                border: "1px solid #fdba74",
              }}
            >
              <span style={{ fontSize: 16, color: "#7c2d12" }}>温度差</span>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#7c2d12" }}>
                {gapSign}
                {latest.gap.toFixed(0)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: "14px 22px",
                borderRadius: 16,
                border: "1px solid #fdba74",
              }}
            >
              <span style={{ fontSize: 16, color: "#7c2d12" }}>
                サンプル数
              </span>
              <span style={{ fontSize: 36, fontWeight: 800, color: "#7c2d12" }}>
                {analysis.sampleSize.toLocaleString()} 日
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 20,
            color: "#7c2d12",
            borderTop: "1px solid #fdba7440",
            paddingTop: 16,
          }}
        >
          kabuonkei.com/analysis/temperature-divergence
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
