import { useSyncExternalStore } from "react";

function subscribeNothing(): () => void {
  return () => {};
}

/**
 * ブラウザでハイドレーションが終わった後だけ true を返す（サーバー描画と初回ハイドレーションでは false）。
 * effect 内で setState(true) する書き方の代わり（react-hooks の set-state-in-effect を避ける）。
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}
