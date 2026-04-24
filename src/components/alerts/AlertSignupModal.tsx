"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AlertVariantCheckboxes from "./AlertVariantCheckboxes";
import { trackEvent } from "@/lib/analytics";
import type { AlertVariant } from "@/lib/types";

interface Props {
  defaultVariants: AlertVariant[];
  onClose: () => void;
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

export default function AlertSignupModal({ defaultVariants, onClose }: Props) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [variants, setVariants] = useState<AlertVariant[]>(defaultVariants);
  const [consent, setConsent] = useState(false);
  const [hpField, setHpField] = useState("");
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
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
    requestAnimationFrame(() => setShow(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    initialFocusRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function requestClose() {
    setShow(false);
    window.setTimeout(onClose, 200);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
      if (e.key === "Tab" && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setState({ kind: "submitting" });
    trackEvent("alerts_subscribe_submitted", {
      variants_count: variants.length,
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
        trackEvent("alerts_subscribe_error", { code });
        return;
      }
      setState({ kind: "success", email: email.trim() });
      trackEvent("alerts_subscribe_success");
    } catch {
      setState({
        kind: "error",
        message: ERROR_MESSAGE_MAP.invalid_json,
      });
      trackEvent("alerts_subscribe_error", { code: "network_error" });
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden={!show}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={requestClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`
          absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-xl
          max-h-[90vh] overflow-y-auto
          transition-transform duration-300 ease-out
          md:left-1/2 md:right-auto md:top-1/2 md:bottom-auto
          md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[480px] md:max-w-[calc(100vw-2rem)]
          md:rounded-2xl
          ${
            show
              ? "translate-y-0 md:opacity-100 md:scale-100"
              : "translate-y-full md:translate-y-[-50%] md:opacity-0 md:scale-95"
          }
        `}
      >
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" aria-hidden="true" />
        </div>

        <div className="flex items-center justify-between px-5 pt-4 md:pt-5">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            🔔 温度アラートに登録
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={requestClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5">
          {state.kind === "success" ? (
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
              <button
                type="button"
                onClick={requestClose}
                className="mt-4 w-full py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-black transition-colors"
              >
                閉じる
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
