/**
 * サイトで使う Web フォントを Google Fonts から取得し、リポジトリ内に置く。
 *
 * next/font/google はビルドのたびに Google Fonts へ取りに行き、Vercel のビルドキャッシュが
 * 壊れると `@vercel/turbopack-next/internal/font/google/font` を解決できずに失敗していた
 * （2026-11 に 3 回）。フォントを public/fonts/ に固定し、@font-face を静的な CSS で
 * 書くことでビルド時の外部取得をなくす。
 *
 * 和文フォントは Google と同じく unicode-range ごとに分割したファイル（1 書体あたり 100 個強）を
 * そのまま置く。ブラウザはページに出てくる文字の分だけ取得するので、従来と通信量は変わらない。
 *
 * 出力:
 * - public/fonts/<書体>/<内容のハッシュ>.woff2
 * - src/app/fonts.css（@font-face と --font-* 変数。layout.tsx で読み込む）
 * - src/app/font-preloads.ts（欧文・数字の分割ファイル。layout.tsx で preload する）
 *
 * 実行: npm run fonts:download（書体やウェイトを変えたときだけ。生成物はコミットする）
 */
import { createHash } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

interface FontFamilySpec {
  /** 出力先ディレクトリ名 */
  slug: string;
  /** CSS 上の font-family 名 */
  family: string;
  /** Google Fonts css2 API の family パラメータ */
  query: string;
  /** この書体を参照する CSS 変数 */
  cssVar: string;
  /** フォールバック（変数の値の後ろに付ける。空なら付けない） */
  fallback: string;
  /** 欧文の分割ファイルを preload するか */
  preloadLatin: boolean;
}

// ウェイトは next/font/google 時代の指定と同じ（見た目を変えない）
const FAMILIES: FontFamilySpec[] = [
  {
    slug: "noto-sans-jp",
    family: "Noto Sans JP",
    query: "Noto+Sans+JP:wght@400;500;700",
    cssVar: "--font-sans-jp",
    // globals.css で後ろに Geist を続けるので総称ファミリーは付けない
    fallback: "",
    preloadLatin: true,
  },
  {
    slug: "noto-serif-jp",
    family: "Noto Serif JP",
    query: "Noto+Serif+JP:wght@600;800",
    cssVar: "--font-serif-jp",
    // .font-serif-jp 側で游明朝などのフォールバックを続ける
    fallback: "",
    preloadLatin: false,
  },
  {
    slug: "geist",
    family: "Geist",
    query: "Geist:wght@100..900",
    cssVar: "--font-geist-sans",
    // globals.css で後ろに Arial, Helvetica, sans-serif を続けるので付けない
    fallback: "",
    preloadLatin: false,
  },
  {
    slug: "geist-mono",
    family: "Geist Mono",
    query: "Geist+Mono:wght@100..900",
    cssVar: "--font-geist-mono",
    fallback: "monospace",
    preloadLatin: false,
  },
];

// woff2 と unicode-range 分割の CSS を返してもらうため、最近の Chrome の UA を名乗る
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// 実行場所によらずリポジトリ直下を基準にする
const ROOT = path.resolve(__dirname, "..");
// 全書体の取得が終わるまでここに置き、成功したら public/fonts/ と入れ替える（途中で失敗しても既存のフォントを壊さない）
const STAGING_DIR = path.join(ROOT, ".fonts-staging");
const PUBLIC_FONTS_DIR = path.join(ROOT, "public", "fonts");
const CSS_OUT = path.join(ROOT, "src", "app", "fonts.css");
const PRELOADS_OUT = path.join(ROOT, "src", "app", "font-preloads.ts");

/** 欧文・数字（Basic Latin を含む）の分割か */
function isLatinBlock(block: string): boolean {
  return /unicode-range:\s*U\+0000-00FF/i.test(block);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

async function fetchBinary(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function processFamily(
  spec: FontFamilySpec,
  stagingDir: string,
): Promise<{ css: string; preloads: string[]; files: number; bytes: number }> {
  const css = await fetchText(
    `https://fonts.googleapis.com/css2?family=${spec.query}&display=swap`,
  );
  const outDir = path.join(stagingDir, spec.slug);
  await mkdir(outDir, { recursive: true });

  // 同じファイルが複数ウェイトの @font-face から参照される（可変フォント）ので URL 単位で 1 回だけ取得する
  const urlToLocal = new Map<string, string>();
  let bytes = 0;
  const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)\s]+/g) ?? [])];
  if (urls.length === 0) throw new Error(`${spec.family}: フォントの URL が見つからない`);

  const CONCURRENCY = 8;
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    await Promise.all(
      urls.slice(i, i + CONCURRENCY).map(async (url) => {
        const data = await fetchBinary(url);
        const hash = createHash("sha256").update(data).digest("hex").slice(0, 16);
        const fileName = `${hash}.woff2`;
        await writeFile(path.join(outDir, fileName), data);
        urlToLocal.set(url, `/fonts/${spec.slug}/${fileName}`);
        bytes += data.length;
      }),
    );
  }

  const blocks = css.match(/@font-face\s*{[^}]*}/g) ?? [];
  const preloads = new Set<string>();
  const rewritten = blocks.map((block) => {
    const out = block
      .replace(/https:\/\/fonts\.gstatic\.com\/[^)\s]+/g, (url) => {
        const local = urlToLocal.get(url);
        if (!local) throw new Error(`未取得の URL: ${url}`);
        return local;
      });
    if (spec.preloadLatin && isLatinBlock(block)) {
      const m = out.match(/url\(([^)]+)\)/);
      if (m) preloads.add(m[1]);
    }
    return out;
  });

  return {
    css: `/* ${spec.family} */\n${rewritten.join("\n")}`,
    preloads: [...preloads],
    files: urlToLocal.size,
    bytes,
  };
}

async function main() {
  await rm(STAGING_DIR, { recursive: true, force: true });
  const cssParts: string[] = [];
  const preloads: string[] = [];
  for (const spec of FAMILIES) {
    const result = await processFamily(spec, STAGING_DIR);
    cssParts.push(result.css);
    preloads.push(...result.preloads);
    console.log(
      `${spec.family}: ${result.files} files, ${(result.bytes / 1024 / 1024).toFixed(1)} MB`,
    );
  }

  // 全書体そろったので入れ替える（public/fonts/ はこのスクリプト専用）
  await rm(PUBLIC_FONTS_DIR, { recursive: true, force: true });
  await rename(STAGING_DIR, PUBLIC_FONTS_DIR);

  const vars = FAMILIES.map(
    (f) => `  ${f.cssVar}: "${f.family}"${f.fallback ? `, ${f.fallback}` : ""};`,
  ).join("\n");
  const header = `/*
 * このファイルは scripts/download-fonts.ts が生成する。手で編集しない（npm run fonts:download）。
 * フォント本体は public/fonts/ にあり、Google Fonts と同じ unicode-range 分割で必要な文字の分だけ読み込まれる。
 */
:root {
${vars}
}
`;
  await writeFile(CSS_OUT, `${header}\n${cssParts.join("\n\n")}\n`);

  await writeFile(
    PRELOADS_OUT,
    `// scripts/download-fonts.ts が生成する。手で編集しない（npm run fonts:download）。
// 本文フォントの欧文・数字の分割ファイル。数字はファーストビューに必ず出るので先読みする。
export const FONT_PRELOADS: readonly string[] = ${JSON.stringify(preloads, null, 2)};
`,
  );
  console.log(`wrote ${path.relative(ROOT, CSS_OUT)} / ${path.relative(ROOT, PRELOADS_OUT)}`);
}

main().catch(async (err) => {
  console.error(err);
  await rm(STAGING_DIR, { recursive: true, force: true });
  process.exit(1);
});
