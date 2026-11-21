import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest の globals を使っていないため Testing Library の自動 cleanup が登録されない。
// 描画したツリーを残したまま jsdom が閉じると、React の残りの処理が window の無い状態で走り
// 「window is not defined」の Unhandled Error になることがあるので、テストごとに片付ける
afterEach(() => {
  cleanup();
});
