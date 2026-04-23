import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import { getPortfolioHistory } from "@/lib/portfolio";

export const alt = "温度連動バーチャルポートフォリオ（シミュレーション）— 株温計";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default async function Image() {
  const history = getPortfolioHistory();
  const jp = history.portfolios.jp;
  const us = history.portfolios.us;

  const charSet =
    "温度連動バーチャルポートフォリオシミュレーション株温計日本米国日経S&P500NAVCAGR最大ドローダウンリバランス月次ベンチマーク対比株現金配分累計リターン比率積立を上回った過去約年でNISA型vs買持ち浅いkabuonkei";
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
            "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
          fontFamily: "NotoSansJP, sans-serif",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={svgDataUri} width={56} height={56} alt="thermometer" />
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#1e3a8a",
              letterSpacing: -1,
            }}
          >
            株温計
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#1e40af",
              marginLeft: 8,
              marginTop: 10,
            }}
          >
            温度連動ポートフォリオ（シミュレーション）
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
              fontSize: 48,
              fontWeight: 900,
              color: "#1e3a8a",
              lineHeight: 1.15,
              marginBottom: 12,
            }}
          >
            積立を上回った温度連動リバランス
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 500,
              color: "#475569",
              lineHeight: 1.4,
              marginBottom: 28,
            }}
          >
            過去約10年で NISA 積立型（DCA）を日米ともに上回る月次リバランス
          </div>

          <div style={{ display: "flex", gap: 24 }}>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: 24,
                borderRadius: 20,
                border: "1px solid #bfdbfe",
              }}
            >
              <span style={{ fontSize: 20, color: "#1e40af" }}>🇯🇵 日本（日経225）</span>
              <span style={{ fontSize: 40, fontWeight: 900, color: "#dc2626" }}>
                積立 比 {formatPct(jp.stats.alphaVsDca)}pp
              </span>
              <span style={{ fontSize: 20, color: "#475569", marginTop: 4 }}>
                温度 {formatPct(jp.stats.totalReturn)} / 積立 {formatPct(jp.stats.dcaReturn)}
              </span>
              <span style={{ fontSize: 18, color: "#94a3b8", marginTop: 6 }}>
                最大DD {jp.stats.maxDrawdown.toFixed(1)}% / 買い持ち {jp.stats.benchmarkMaxDrawdown.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: 24,
                borderRadius: 20,
                border: "1px solid #bfdbfe",
              }}
            >
              <span style={{ fontSize: 20, color: "#1e40af" }}>🇺🇸 米国（S&amp;P500）</span>
              <span style={{ fontSize: 40, fontWeight: 900, color: "#dc2626" }}>
                積立 比 {formatPct(us.stats.alphaVsDca)}pp
              </span>
              <span style={{ fontSize: 20, color: "#475569", marginTop: 4 }}>
                温度 {formatPct(us.stats.totalReturn)} / 積立 {formatPct(us.stats.dcaReturn)}
              </span>
              <span style={{ fontSize: 18, color: "#94a3b8", marginTop: 6 }}>
                最大DD {us.stats.maxDrawdown.toFixed(1)}% / 買い持ち {us.stats.benchmarkMaxDrawdown.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#1e40af",
            borderTop: "1px solid #bfdbfe",
            paddingTop: 12,
          }}
        >
          <span>kabuonkei.com/portfolio</span>
          <span>
            {history.dataRange.from} 〜 {history.dataRange.to}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
