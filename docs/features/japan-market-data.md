# 日本市場データ

- `src/data/japan-market-data.json`: JPX公開データから取得した日本市場固有の需給データ
  - **投資主体別売買動向**: 海外投資家・個人・信託銀行・投資信託・事業法人の週次売買差引（億円）
  - **裁定残**: 裁定買い残・売り残の日次データ（百万株）
  - **信用倍率**: 信用買い残・売り残（億円）と信用倍率（= 買残/売残）の週次データ。JPX「信用取引現在高」ページから取得
- 生成スクリプト: `npm run generate:japan-market`（`scripts/generate-japan-market-data.ts`）
- データソース: JPXの統計ページからExcel/CSVをダウンロードしてパース
  - 2026-10 下旬に JPX が投資部門別（`stock_val_1_*.xls` → `stock_1_w_*.xlsx`）と信用取引現在高（`mtseisan*.xls` → `*_mtcurrent.xlsx`）のファイル名・レイアウトを変更。パーサは `scripts/_lib/jpx-investor.ts` / `jpx-margin.ts` / `jpx-arbitrage.ts`。いずれかの取得が 0 件だと `generate-japan-market-data.ts` は JSON を書き出さずに異常終了する（空データで上書きして需給の温度が黙って欠損するのを防ぐため）。CI が失敗したらまずファイル名・レイアウト変更を疑う
- **列配置の検証**: 投資部門別（`scripts/_lib/jpx-investor.ts` の `parseInvestorXlsx`）は、読む列すべての見出し（海外投資家の「法人」「個人」、個人の「現金」「信用」など）と「差引」列の見出しを確かめ、さらに値でも 差引 = 買 − 売 を照合する。1 つでも合わなければその週は null。`generate:japan-market` は 1 週でも読めなければ書き出さずに異常終了する（一部の週が欠けたまま直近 4 週の合計を計算しないため）。失敗は定期実行の見張りがメールで知らせる
- **投資部門別の過去の推移（`investor-flow-history.json`、2026-11-20〜）**: `/learn/what-is-investor-flow` の集計用に、海外投資家と個人の週次の売買差引（億円）を 2016-01 から持つ。区分変更（東証一部 → プライム、2022-04）をまたいで比べるため、プライムではなく二市場（東証・名証の合計）を使う（プライムとは週によって数千億円ずれる。例: 2026-10-30 の週はスタンダードで海外が 3,210 億円売り越し、プライム +2,063 / 二市場 -2,176）。〜2026-09 第 2 週は旧形式 `stock_val_1_YYMMW.xls`（年ごとの一覧 `investor-type/00-00-archives-NN.html`、00 が今年）の「Tokyo & Nagoya」シート、2026-09-14 の週以降は新形式 xlsx の「二市場」行。`npm run update:investor-flow` は最新ページと今年・去年の一覧から足りない週だけ足し、`-- --full` で作り直す。1 件でも読めなければ書き出さずに異常終了するが、月次の update-historical-stats.yml では `continue-on-error` なので他の統計の更新は止めない（前回分のまま）
- **自動更新**: GitHub Actions（`.github/workflows/update-japan-market-data.yml`）で毎週 水・木 JST 16 時台に自動実行（Vercel Cron の `japan-market` ジョブが起動。ワークフローの schedule `0 8 * * 3,4` は予備）。JPX の公表タイミングに合わせており、水曜は同日 15:00 公表の「信用取引現在高」（信用倍率）、木曜は同日 15:30 公表の「投資部門別売買状況」を当日中に取り込む。裁定残は毎営業日 16:00 に T+2 営業日分が公表されるのでどちらの回でも最新が取れる
- 投資部門別（海外投資家の 4 週累計）と信用残（買い残の 4 週変化）は、ゲージ下の「需給の温度」の入力になる。市場温度そのものには使わない。信用残は JPX のページに直近約 5 週しか載らないため、`margin-ratio-history.json` の長期履歴と合わせて使う（`mergeMarginWeeks()`）
- 裁定残は 2026-11-17 に温度の構成要素から外した（データカードの表示のみ）
