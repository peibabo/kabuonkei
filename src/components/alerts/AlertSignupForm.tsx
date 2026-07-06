"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import AlertVariantCheckboxes from "./AlertVariantCheckboxes";
import { trackEvent } from "@/lib/analytics";
import type { AlertVariant } from "@/lib/types";

interface Props {
  defaultVariants: AlertVariant[];
  /** マウント時にメール入力へフォーカスする（モーダル用） */
  autoFocus?: boolean;
  /** GA イベントに付与する設置場所ラベル */
  source: "modal" | "landing";
  /** 成功表示の下に置く要素（モーダルの「閉じる」ボタンなど） */
  successAction?: ReactNode;
}

type FormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; email: string }
  | { kind: "error"; message: string };

const ERROR_MESSAGE_MAP: Record<string, string> = {
  email_invalid: "メールアドレスの形式が正しくありません。",
  consent_required: "プライバシーポリシーへの同意が必要です。",
  variants_required: "通知する温度を 1 つ以上選択してください。",
  variants_invalid: "選択できない通知対象が含まれています。",
  invalid_request: "送信内容に不備があります。ページを再読み込みしてください。",
  invalid_json: "送信に失敗しました。しばらくしてから再度お試しください。",
  rate_limited: "短時間に試行しすぎました。少し時間をおいてから再度お試しください。",
  forbidden_origin: "送信元が許可されていません。",
  email_send_failed: "メール送信に失敗しました。時間をおいて再度お試しください。",
};

export default function AlertSignupForm({
  defaultVariants,
  autoFocus = false,
  source,
  successAction,
}: Props) {
  const [email, setEmail] = useState("");
  const [variants, setVariants] = useState<AlertVariant[]>(defaultVariants);
  const [consent, setConsent] = useState(false);
  const [hpField, setHpField] = useState("");
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const initialFocusRef = useRef<HTMLInputElement>(null);

  const canSubmit = useMemo(() => {
    return (
      state.kind !== "submitting" &&
      email.trim().length > 0 &&
      variants.length > 0 &&
      consent
    );
  }, [email, variants, consent, state.kind]);

  useEffect(() => {
    if (autoFocus) initialFocusRef.current?.focus();
  }, [autoFocus]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setState({ kind: "submitting" });
    trackEvent("alerts_subscribe_submitted", {
      variants_count: variants.length,
      source,
    });
    try {
      const res = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          variants,
          consent: true,
          hp_field: hpField,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        const code = data.error ?? "invalid_json";
        setState({
          kind: "error",
          message: ERROR_MESSAGE_MAP[code] ?? ERROR_MESSAGE_MAP.invalid_json,
        });
        trackEvent("alerts_subscribe_error", { code, source });
        return;
      }
      setState({ kind: "success", email: email.trim() });
      trackEvent("alerts_subscribe_success", { source });
    } catch {
      setState({
        kind: "error",
        message: ERROR_MESSAGE_MAP.invalid_json,
      });
      trackEvent("alerts_subscribe_error", { code: "network_error", source });
    }
  }

  if (state.kind === "success") {
    return (
      <div className="mt-4">
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-900 font-semibold">
            確認メールを送信しました
          </p>
          <p className="mt-2 text-sm text-green-800">
            <strong>{state.email}</strong> 宛にメールが届きます。24 時間以内に本文のリンクをクリックして登録を完了してください。
          </p>
          <p className="mt-2 text-xs text-green-700">
            メールが届かない場合は迷惑メールフォルダもご確認ください。
          </p>
        </div>
        {successAction}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="mt-3 text-sm text-gray-600">
        米国/日本の温度が極端（≤20 極寒 or ≥80 過熱）になったタイミングでメールでお知らせします。連続発火を防ぐため、状態が変化した瞬間のみ送信します。
      </p>

      <label className="block mt-4">
        <span className="block text-sm font-semibold text-gray-900 mb-1">
          メールアドレス
        </span>
        <input
          ref={initialFocusRef}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          disabled={state.kind === "submitting"}
        />
      </label>

      {/* honeypot: 正常な利用者には見えない。ボットが勝手に埋めがち */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hpField}
            onChange={(e) => setHpField(e.target.value)}
          />
        </label>
      </div>

      <AlertVariantCheckboxes
        value={variants}
        onChange={setVariants}
        disabled={state.kind === "submitting"}
      />

      <label className="flex items-start gap-2 mt-4 text-sm text-gray-700">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 text-blue-600 rounded"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={state.kind === "submitting"}
        />
        <span>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-900"
          >
            プライバシーポリシー
          </Link>
          に同意します（配信はいつでもワンクリック解除可能）
        </span>
      </label>

      {state.kind === "error" ? (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`mt-5 w-full py-3 rounded-lg font-semibold transition-colors ${
          canSubmit
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        {state.kind === "submitting" ? "送信中…" : "確認メールを送る"}
      </button>

      <p className="mt-3 text-xs text-gray-500">
        登録後、確認メール内のリンクをクリックすると登録完了となります。
      </p>
    </form>
  );
}
