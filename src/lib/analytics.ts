interface GtagWindow extends Window {
  gtag?: (...args: unknown[]) => void;
}

/**
 * GA4 にカスタムイベントを送信する薄いヘルパー。
 * window.gtag が未定義（開発時 NEXT_PUBLIC_GA_ID 未設定など）なら no-op。
 */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  w.gtag?.("event", name, params);
}
