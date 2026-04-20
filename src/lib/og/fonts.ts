/** OG 画像で使う Noto Sans JP フォント仕様（ImageResponse の fonts オプション形状） */
export interface OgFontSpec {
  name: "NotoSansJP";
  data: ArrayBuffer;
  style: "normal";
  weight: 500 | 900;
}

/**
 * Google Fonts から指定文字のサブセットをロードして ArrayBuffer で返す。
 * 取得失敗時は null を返す（呼び出し側でシステムフォントにフォールバック可能）。
 */
export async function loadGoogleFont(
  family: string,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
    const cssRes = await fetch(url);
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format/);
    if (!match) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

/**
 * Noto Sans JP の weight 900 / 500 を同時に取得し、
 * ImageResponse の fonts オプションに渡せる配列を組み立てる。
 * 取得に失敗したウェイトはスキップし、両方失敗なら空配列を返す。
 */
export async function buildNotoSansJpFonts(
  charset: string,
): Promise<OgFontSpec[]> {
  const [boldFont, mediumFont] = await Promise.all([
    loadGoogleFont("Noto+Sans+JP:wght@900", charset),
    loadGoogleFont("Noto+Sans+JP:wght@500", charset),
  ]);
  const fonts: OgFontSpec[] = [];
  if (boldFont) {
    fonts.push({
      name: "NotoSansJP",
      data: boldFont,
      style: "normal",
      weight: 900,
    });
  }
  if (mediumFont) {
    fonts.push({
      name: "NotoSansJP",
      data: mediumFont,
      style: "normal",
      weight: 500,
    });
  }
  return fonts;
}
