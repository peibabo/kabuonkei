/**
 * GA4 / Search Console 定点観測レポート
 *
 * 実行: npm run report:analytics            （既定 直近7日）
 *       npm run report:analytics -- --days 28
 *
 * 認証（優先順）:
 * 1. SA キーファイル `~/.config/kabuonkei-analytics/sa-key.json`
 *    — あればユーザーのログイン不要で恒久動作（推奨。Workspace の
 *    セッションポリシーで gcloud ユーザー認証が短時間で失効するため）
 * 2. gcloud ユーザー認証 + SA 偽装（iamcredentials.generateAccessToken）
 *    — キーが無い場合のフォールバック。`gcloud auth login` 済みが前提
 *
 * SA kabuonkei-reader@... は GA4 プロパティ（閲覧者）と
 * Search Console（制限付き）に追加済みの読み取り専用アカウント。
 * （`gcloud auth print-access-token --impersonate-service-account` は
 * --scopes が無視され Data API に 403 を返すため使わない）
 */

import { execSync } from "child_process";
import { createSign } from "crypto";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const GA4_PROPERTY = "properties/533599464"; // kabuonkei（株温計）
const SC_SITE = "https://www.kabuonkei.com/";
const SERVICE_ACCOUNT =
  "kabuonkei-reader@kabuonkei-analytics.iam.gserviceaccount.com";
const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

// --- 純粋関数（テスト対象） ----------------------------------------------------

/** "20260703" → "07/03" */
export function formatGa4Date(yyyymmdd: string): string {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`;
}

/** JST 基準で n 日前の日付を "YYYY-MM-DD" で返す（SC API は明示日付が必須） */
export function jstDateNDaysAgo(n: number, now = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 3600_000);
  jst.setUTCDate(jst.getUTCDate() - n);
  return jst.toISOString().split("T")[0];
}

/** 表形式の行を整形（ラベル幅を揃える） */
export function padLabel(label: string, width: number): string {
  // 全角文字は幅2として計算
  let w = 0;
  for (const ch of label) w += ch.charCodeAt(0) > 0xff ? 2 : 1;
  return label + " ".repeat(Math.max(0, width - w));
}

// --- API ヘルパー ---------------------------------------------------------------

const SA_KEY_PATH = join(
  homedir(),
  ".config",
  "kabuonkei-analytics",
  "sa-key.json"
);

/** SA キー（JWT 署名）でアクセストークンを取得。gcloud 不要 */
async function tokenFromKeyFile(): Promise<string> {
  const key = JSON.parse(readFileSync(SA_KEY_PATH, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: key.client_email,
    scope: SCOPES.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(key.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${signature}`,
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`SAキーでのトークン取得失敗: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json.access_token;
}

/** gcloud ユーザー認証 + SA 偽装でトークンを取得（キーが無い場合のフォールバック） */
function tokenFromImpersonation(): string {
  const userToken = execSync("gcloud auth print-access-token", {
    encoding: "utf8",
  }).trim();
  const res = execSync(
    `curl -s -H "Authorization: Bearer ${userToken}" -H "Content-Type: application/json" ` +
      `-d '${JSON.stringify({ scope: SCOPES })}' ` +
      `"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SERVICE_ACCOUNT}:generateAccessToken"`,
    { encoding: "utf8" }
  );
  const token = JSON.parse(res).accessToken;
  if (!token) {
    throw new Error(`SAトークン取得失敗: ${res.slice(0, 300)}`);
  }
  return token;
}

async function getSaToken(): Promise<string> {
  if (existsSync(SA_KEY_PATH)) return tokenFromKeyFile();
  return tokenFromImpersonation();
}

async function postJson(
  url: string,
  token: string,
  body: unknown
): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(`${url} → ${JSON.stringify(json.error).slice(0, 300)}`);
  }
  return json;
}

async function getJson(url: string, token: string): Promise<any> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

function ga4RunReport(token: string, body: unknown): Promise<any> {
  return postJson(
    `https://analyticsdata.googleapis.com/v1beta/${GA4_PROPERTY}:runReport`,
    token,
    body
  );
}

// --- メイン ---------------------------------------------------------------------

async function main() {
  const daysArg = process.argv.indexOf("--days");
  const days = daysArg >= 0 ? Number(process.argv[daysArg + 1]) || 7 : 7;
  const token = await getSaToken();

  console.log(`\n🌡 株温計 アクセスレポート（直近${days}日）\n${"=".repeat(48)}`);

  // 1. 日別ユーザー / PV
  const daily = await ga4RunReport(token, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });
  console.log("\n## 日別ユーザー / PV");
  let totalUsers = 0;
  let totalPv = 0;
  for (const r of daily.rows ?? []) {
    const users = Number(r.metricValues[0].value);
    const pv = Number(r.metricValues[1].value);
    totalUsers += users;
    totalPv += pv;
    console.log(
      `  ${formatGa4Date(r.dimensionValues[0].value)}  users ${String(users).padStart(4)}  pv ${String(pv).padStart(5)}`
    );
  }
  console.log(`  合計       users ${String(totalUsers).padStart(4)}  pv ${String(totalPv).padStart(5)}`);

  // 2. 流入元 TOP10
  const sources = await ga4RunReport(token, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  });
  console.log("\n## 流入元 TOP10（セッション）");
  for (const r of sources.rows ?? []) {
    const label = `${r.dimensionValues[0].value} / ${r.dimensionValues[1].value}`;
    console.log(`  ${padLabel(label, 36)} ${r.metricValues[0].value}`);
  }

  // 3. note 流入（utm_source=note）
  const note = await ga4RunReport(token, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "sessionCampaignName" }, { name: "landingPage" }],
    metrics: [{ name: "sessions" }, { name: "activeUsers" }],
    dimensionFilter: {
      filter: {
        fieldName: "sessionSource",
        stringFilter: { value: "note" },
      },
    },
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  });
  console.log("\n## note 流入（utm_source=note）");
  if ((note.rows ?? []).length === 0) {
    console.log("  （まだ流入なし）");
  } else {
    for (const r of note.rows) {
      console.log(
        `  ${padLabel(r.dimensionValues[0].value, 12)} ${padLabel(r.dimensionValues[1].value, 28)} sessions ${r.metricValues[0].value} / users ${r.metricValues[1].value}`
      );
    }
  }

  // 4. ページ別 TOP10
  const pages = await ga4RunReport(token, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 10,
  });
  console.log("\n## ページ別 PV TOP10");
  for (const r of pages.rows ?? []) {
    console.log(
      `  ${padLabel(r.dimensionValues[0].value, 40)} ${r.metricValues[0].value}`
    );
  }

  // 5. Search Console（データは2〜3日遅延するので3日前を終端にする）
  const scEnd = jstDateNDaysAgo(3);
  const scStart = jstDateNDaysAgo(3 + days);
  const scBase = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SC_SITE)}`;

  const scTotals = await postJson(`${scBase}/searchAnalytics/query`, token, {
    startDate: scStart,
    endDate: scEnd,
  });
  const t = scTotals.rows?.[0];
  console.log(`\n## Google 検索（${scStart} 〜 ${scEnd}）`);
  console.log(
    t
      ? `  クリック ${t.clicks} / 表示 ${t.impressions} / CTR ${(t.ctr * 100).toFixed(1)}% / 平均掲載順位 ${t.position.toFixed(1)}`
      : "  （データなし）"
  );

  const scQueries = await postJson(`${scBase}/searchAnalytics/query`, token, {
    startDate: scStart,
    endDate: scEnd,
    dimensions: ["query"],
    rowLimit: 10,
  });
  console.log("\n## 検索クエリ TOP10");
  if ((scQueries.rows ?? []).length === 0) {
    console.log("  （まだ検索流入なし）");
  } else {
    for (const r of scQueries.rows) {
      console.log(
        `  ${padLabel(r.keys[0], 32)} clicks ${r.clicks} / imp ${r.impressions} / pos ${r.position.toFixed(1)}`
      );
    }
  }

  // 6. sitemap インデックス状況
  const sitemaps = await getJson(`${scBase}/sitemaps`, token);
  const sm = sitemaps.sitemap?.[0];
  console.log("\n## sitemap インデックス状況");
  if (sm) {
    const c = sm.contents?.[0];
    console.log(
      `  submitted ${c?.submitted ?? "—"} / indexed ${c?.indexed ?? "—"}（最終取得 ${sm.lastDownloaded?.split("T")[0] ?? "—"}）`
    );
  } else {
    console.log("  （sitemap 未登録）");
  }

  console.log("");
}

// テストから import された場合は実行しない
if (process.argv[1]?.includes("report-analytics")) {
  main().catch((e) => {
    console.error("❌ レポート失敗:", e.message);
    process.exit(1);
  });
}
