# 温度アラート（メール通知）

極端温度（米国/日本 F&G が `≤20` or `≥80`）に遷移したタイミングで、事前登録したメールアドレスに通知を送る機能。Tier1 のリテンション施策かつ将来のマネタイズ基盤（メール資産）。

## 全体像

```
[Dashboard]                    [/alerts ランディングページ]
    │ AlertBanner クリック           │ インラインフォーム
    ▼                              ▼
[AlertSignupModal] ──────▶ [AlertSignupForm]
                                │ POST /api/alerts/subscribe ─▶ Upstash Redis（pending）
                                └────────────────────────────▶ Resend（確認メール）
    │
ユーザーが確認メールのリンクを踏む
    ▼
[GET /api/alerts/verify?token=xxx]  ─▶ Redis（verified=true, variant index に追加）
                                     └▶ 302 /alerts/verified

---

[GitHub Actions cron]
 - 平日 07:00 JST (US)  → scripts/check-temperature-alerts.ts --variant us
 - 平日 17:15 JST (JP)  → 同 --variant jp
    │
    ├─ スコア取得（US: VIX + F&G / JP: snapshots.json 最新）
    ├─ Redis の last-state と比較 → 状態遷移判定
    ├─ shouldFire なら variant の verified 購読者を列挙
    └─ Resend で並列送信（120ms throttle）→ last-state 更新
```

## 発火ロジック（状態遷移＋ヒステリシス）

`src/lib/alerts/state-transition.ts` の純粋関数で表現。

- `computeCurrentState(prev, score)`:
  - `score ≤ 20` → `"cold"`
  - `score ≥ 80` → `"hot"`
  - `20 < score < 80` の範囲:
    - prev=="cold" かつ score < 25 → まだ `"cold"`（ヒステリシス）
    - prev=="hot" かつ score > 75 → まだ `"hot"`（ヒステリシス）
    - それ以外 → `"neutral"`
- `shouldFire(prev, curr)`:
  - curr=="neutral" → 発火せず
  - prev==curr（同じ極端域）→ 発火せず（連続発火防止）
  - それ以外（neutral→cold/hot または cold↔hot 直接反転）→ 発火、`kind=curr`
- 初回実行時（prev 未設定）は `"neutral"` 扱い → バックフィル時の誤発火を回避

## Redis キー設計（`src/lib/alerts/keys.ts`）

| キー | 型 | 用途 | TTL |
|---|---|---|---|
| `alerts:sub:{uuid}` | Hash | 購読者本体（email/emailHash/variants/verified/createdAt/verifiedAt/unsubscribeToken） | なし |
| `alerts:email:{sha256(email)}` | String（value=uuid） | 重複登録検知 | なし |
| `alerts:verify-pending:{sha256(token)}` | String（value=uuid） | 未確認登録の逆引き | 24h |
| `alerts:last-state:{us\|jp}-fg` | String | 前回状態（cold/neutral/hot） | なし |
| `alerts:index:{variant}` | Set（uuid 集合） | variant 別の送信対象 index | なし |
| `alerts:rate:ip:{ip}` | Int（INCR） | IP レート制限 5/10min | 10min |
| `alerts:rate:email:{emailHash}` | Int（INCR） | email レート制限 3/1h | 1h |
| `alerts:failures:{YYYY-MM-DD(JST)}:{variant}` | Set | 送信失敗ログ | 30d |
| `alerts:blocklist:{emailHash}` | String | 配信解除した記録（ハッシュのみ）。再登録はブロックせず、verify 成功時に自動クリア。診断・分析用 | 365d |

## HMAC トークン（`src/lib/alerts/tokens.ts`）

- `ALERTS_TOKEN_SECRET`（32 バイト以上のランダム）で HMAC-SHA256 署名
- Payload: `base64url(JSON.stringify({uuid, action, exp}))`
  - `action = "verify"` → `exp = now + 24h`
  - `action = "unsubscribe"` → `exp = null`（恒久）
- Token 形式: `{payloadB64}.{hmacB64}`、検証は `timingSafeEqual`
- **SECRET ローテーション時**: 恒久 unsubscribe トークンが全無効化 → 新 SECRET 配布後、古いトークンは検証失敗 → 再発送のワークフローを整える必要あり（MVP ではローテーション運用は発生想定外）

## セキュリティ・スパム対策

- **Origin 検証**: `ALERTS_ALLOWED_ORIGINS`（または `NEXT_PUBLIC_SITE_URL`）+ `*.vercel.app` のみ許可。他は 403
- **Content-Type**: `application/json` 必須（415）
- **Honeypot**: `hp_field` が空でない場合 reject（ボット対策）
- **Consent**: `consent === true` 必須
- **レート制限**: IP 5/10min、email 3/1h
- **Email enumeration 防止**: 既存 email 再登録時、および rate-limit 超過時も成功レスポンス文言を返す
- **Double opt-in**: 確認メール経由でのみ verified
- **配信解除後の再登録**: 解除すると `alerts:blocklist:{emailHash}` を記録するが、再登録はブロックしない（旧仕様は 365 日無音ブロックで、解除済みユーザーが「確認メールを送信しました」と表示されたまま二度と登録できないトラップだった）。再登録時は通常どおり確認メールを送り、verify 成功＝本人の再受信意思の証明として blocklist を自動クリアする。爆撃対策は IP/email レート制限が担う
- **reCAPTCHA 不採用**: MVP では UX 優先。被害が出たら Cloudflare Turnstile を追加

## API Route Handlers

### `POST /api/alerts/subscribe`
- Body: `{ email, variants: AlertVariant[], consent: true, hp_field: "" }`
- 成功: `{ ok: true, message: "確認メールを送信しました" }`
- エラー code: `unsupported_media_type` / `forbidden_origin` / `invalid_json` / `email_invalid` / `consent_required` / `variants_required` / `variants_invalid` / `invalid_request` / `rate_limited`（429）/ `email_send_failed`（502）

### `GET /api/alerts/verify?token=xxx`
- 成功 → 302 `/alerts/verified`
- 失敗 → 302 `/alerts/verified?error=expired|invalid`
- 24h 期限、one-time 相当（verify-pending キーが消費される）

### `GET|POST /api/alerts/unsubscribe?token=xxx`
- 成功 → 302 `/alerts/unsubscribed`
- トークン無効 → 302 `/alerts/unsubscribed?error=invalid`
- RFC 8058 One-Click Unsubscribe に対応するため POST も受ける
- メールの `List-Unsubscribe` / `List-Unsubscribe-Post` ヘッダで宣言

## UI

- **AlertBanner**（`src/components/alerts/AlertBanner.tsx`）: Dashboard 最上部に常設。score が極端域なら赤で強調し、初期チェックをその variant に限定
- **AlertSignupForm**（`src/components/alerts/AlertSignupForm.tsx`）: 登録フォーム本体（email / honeypot / variant 選択 / 同意 / 送信 / 成功・エラー表示）。モーダルとランディングページで共用。GA イベントに `source: "modal" | "landing"` を付与
- **AlertSignupModal**（`src/components/alerts/AlertSignupModal.tsx`）: ShareSheet パターンの外枠（Focus trap / ESC / body scroll lock、モバイルは bottom sheet）。中身は `AlertSignupForm`
- **AlertVariantCheckboxes**（`src/components/alerts/AlertVariantCheckboxes.tsx`）: 4 択（米国/日本 × 極寒/過熱）、複数選択可
- **`/alerts`**（`src/app/alerts/page.tsx`）: ランディングページ。機能説明 + 通知タイミング + インライン登録フォーム + FAQ。indexable（sitemap / フッターにも掲載）で、note 記事などの外部誘導リンクの受け皿（2026-07 に note-001 が 404 に誘導していた問題の恒久対応として新設）
- **`/alerts/verified`・`/alerts/unsubscribed`**: 完了ページ（noindex）
- GA4: `alerts_banner_clicked` / `alerts_subscribe_submitted` / `alerts_subscribe_success` / `alerts_subscribe_error`（subscribe 系は `source` パラメータ付き）

## 発火スクリプトと GitHub Actions

- `scripts/check-temperature-alerts.ts`（`npm run alerts:check -- --variant us|jp [--dry-run]`）
  - US: VIX → `fetchFearGreedIndex(vix)` で取得
  - JP: `src/data/japan-fg-snapshots.json` の `snapshots` 配列末尾を参照（snapshot-japan-fg ワークフローが 17:00 JST に更新）
  - **JP スコアの鮮度ガード**（`pickFreshJpScore()`、`scripts/_lib/alert-state.ts`）: 最新エントリの日付が今日（JST）でなければ採用せず exit 1（状態も更新しない）。snapshot job の遅延/失敗時に前日値で誤発火/失報するのを防ぐ
  - 対象購読者の列挙 → Resend 送信（120ms スロットル）→ 失敗は `alerts:failures:*` に記録
  - `--dry-run` で Redis 書き込みと Resend 呼び出しをスキップ
- `.github/workflows/check-temperature-alerts.yml`
  - cron `0 22 * * 0-4`（US 07:00 JST）/ `15 8 * * 1-5`（JP 17:15 JST）
  - workflow_dispatch で variant と dry_run を手動指定可能
  - JP variant は cron 遅延レース対策として、今日の日付のスナップショットが main に現れるまで最大 12 分ポーリング（`git fetch` + 該当ファイルのみ checkout）。タイムアウト時はスクリプト側の鮮度ガードが中断する

## 環境変数

```
# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev  # 独自ドメイン整備後に alerts@kabuonkei.com に切替

# Upstash Redis（Vercel Marketplace の "Upstash for Redis" 統合で自動注入）
KV_REST_API_URL=
KV_REST_API_TOKEN=
# GitHub Actions 側では Secrets に同名で手動コピーが必要

# HMAC 鍵
ALERTS_TOKEN_SECRET=  # openssl rand -hex 32

# 任意（Origin ホワイトリストをカンマ区切りで上書き）
ALERTS_ALLOWED_ORIGINS=
```

## DNS 設定（独自ドメインに切替えるとき）

初期は `onboarding@resend.dev` で運用し、メール到達性を改善したくなったら `kabuonkei.com` で検証する。

1. Resend Dashboard → Domains → `kabuonkei.com` を追加
2. 指示される DNS レコード（SPF / DKIM × 2-3 / DMARC）を追加
3. 検証完了後、`RESEND_FROM_EMAIL=alerts@kabuonkei.com` へ切替（Vercel + GitHub Secrets 両方）

DMARC 推奨値:
```
_dmarc.kabuonkei.com  TXT  "v=DMARC1; p=quarantine; rua=mailto:info@kabuonkei.com"
```

**注意**: Resend 無料プランは Verified Domain 1 個まで。他プロジェクトで使用中なら Resend 有料プラン ($20/月) 必要。

## 運用観点

- **購読者数モニタリング**: Upstash Dashboard で `alerts:index:*` の Set サイズを確認
- **送信失敗確認**: `alerts:failures:{date}:{variant}` を手動で覗く
- **購読者のエクスポート**（データ移行等）: `SCAN alerts:sub:*` + `HGETALL` を小さなスクリプトで
- **Resend 枠監視**: 無料枠 3,000 通/月。購読者が増えてきたら有料化 or SendGrid/Brevo への差し替えを検討（`src/lib/alerts/resend.ts` の 1 ファイル差し替えで移行可）
- **診断・復旧スクリプト**:
  - `scripts/list-alert-subscribers.ts [--verified-only] [--variant jp_hot]` — 全購読者を TSV で一覧（email / verified / variants / createdAt / verifiedAt）。標準エラーに variant 別カウントのサマリを出す
  - `scripts/diagnose-alerts.ts <email>` — 指定 email の登録状態 / verified / variant index 所属 / 各 last-state / blocklist（配信解除記録）/ email rate-limit カウンタを表示
  - `scripts/repair-alert-indices.ts [--dry-run]` — 全 verified subscriber を `alerts:index:{variant}` に再登録し、`alerts:last-state:{us|jp}-fg` を DEL（再 dispatch を可能に）
  - 実行前に `set -a; source .env.local; set +a` で Upstash 認証情報を環境変数に展開する

## テスト

- `src/__tests__/alerts/state-transition.test.ts` — ヒステリシス + 発火判定の境界値
- `src/__tests__/alerts/tokens.test.ts` — HMAC ラウンドトリップ・改ざん・期限
- `src/__tests__/alerts/keys.test.ts` — Redis キー命名
- `src/__tests__/alerts/subscribe-validation.test.ts` — 入力バリデーション
- `src/__tests__/alerts/email-templates.test.ts` — メール本文の必須要素
- `src/__tests__/alerts/alert-banner.test.tsx` — Banner の状態分岐
- `src/__tests__/alerts/alert-signup-form.test.tsx` — フォームの送信可否・成功/エラー表示・successAction
- `src/__tests__/alerts/alert-variant-checkboxes.test.tsx` — チェックボックス挙動
- `src/__tests__/alerts/parse-variants.test.ts` — variants の配列/JSON 文字列両対応（Upstash auto-deserialize ガード）
- `scripts/__tests__/check-temperature-alerts.test.ts` — CLI ヘルパー

## 後続の候補

1. **Web Push**: 同じ Redis / 発火ロジックに Web Push Subscription を追加レイヤーとして積む（メールとの共存）
2. **LINE / Discord Webhook**: ユーザー側が登録した webhook URL に送信する方式
3. **カスタム閾値**: プリセット（≤20/≥80）に加えて、ユーザーが任意のスコア範囲を指定
4. **配信管理ダッシュボード**: 購読者が自分のアラート設定を編集・履歴確認できる `/alerts/manage` ページ（現状は unsubscribe のみ）
