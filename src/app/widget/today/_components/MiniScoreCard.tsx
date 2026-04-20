/** widget 画像内で 1 市場分の温度を表示する横長カード（ImageResponse 用 JSX） */
export default function MiniScoreCard({
  flag,
  country,
  score,
  level,
  desc,
  color,
}: {
  flag: string;
  country: string;
  score: number | null;
  level: string;
  desc: string;
  color: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: 118,
        display: "flex",
        alignItems: "center",
        background: "#ffffff",
        borderRadius: 16,
        padding: "10px 16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        borderLeft: `8px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 82,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", fontSize: 32 }}>{flag}</div>
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 500,
            color: "#1f2937",
            marginTop: 2,
          }}
        >
          {country}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 78,
          fontWeight: 900,
          color,
          letterSpacing: -2,
          width: 108,
          flexShrink: 0,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {String(score ?? "—")}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: 132,
          flexShrink: 0,
          paddingLeft: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 900,
            color: "#111827",
          }}
        >
          {level}
        </div>
        {desc ? (
          <div
            style={{
              display: "flex",
              fontSize: 15,
              fontWeight: 500,
              color: "#4b5563",
              marginTop: 4,
            }}
          >
            {`(${desc})`}
          </div>
        ) : null}
      </div>
    </div>
  );
}
