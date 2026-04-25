/**
 * アラートモーダルを「画面のどこからでも 1 クリックで開く」ための薄い event bus。
 *
 * AlertBanner だけがモーダルの open state を保持しており、HeadlineHero CTA や
 * DashboardHeader の「アラート登録」リンクはこの bus を経由してモーダルを開く。
 * Context や props 経由のリフトアップを避けることで、AlertBanner を自己完結に
 * 保ったまま 1 クリック登録 UX を実現する。
 */

const EVENT_NAME = "kabuonkei:open-alert-modal";

export interface OpenAlertModalDetail {
  /** どこから開かれたかの GA4 ソース。例: 'hero' / 'header' / 'banner' */
  source: string;
}

/** モーダルを開くよう依頼する。AlertBanner が listening している前提。 */
export function requestOpenAlertModal(source: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OpenAlertModalDetail>(EVENT_NAME, {
      detail: { source },
    }),
  );
}

/** AlertBanner 側で listener を購読するためのヘルパ。React useEffect から呼ぶ想定。 */
export function subscribeOpenAlertModal(
  handler: (detail: OpenAlertModalDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const wrapped = (e: Event) => {
    const detail = (e as CustomEvent<OpenAlertModalDetail>).detail;
    handler(detail);
  };
  window.addEventListener(EVENT_NAME, wrapped);
  return () => window.removeEventListener(EVENT_NAME, wrapped);
}
