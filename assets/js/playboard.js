/**
 * PlayBoard 進度控制
 * - 分數來源優先：window.foodSharingGame.state.score → 退而求其次：cookie(level3_score)
 */
class PlayBoardProgress {
  constructor() {
    this.isCompleted = false;
    this.startTime = Date.now();

    // 等 DOM 就緒後綁 nextButton
    document.addEventListener(
      "DOMContentLoaded",
      () => this._setupNextButton(),
      { once: true }
    );
  }

  _setupNextButton() {
    const nextBtn = document.getElementById("nextButton");
    if (!nextBtn) return;

    const handler = (ev) => {
      // 保守處理行動裝置與內嵌情境的事件衝突
      ev.preventDefault();
      ev.stopPropagation();
      // 用 log 取代 alert（沙箱會阻擋 alert）
      try {
        console.log("[playboard] nextButton pressed");
      } catch {}

      this.completePage();
    };

    ["click", "pointerup", "touchend"].forEach((type) => {
      nextBtn.addEventListener(type, handler, { passive: false });
    });
  }

  // 顯示下一步按鈕（進到第6頁或遊戲完成時呼叫）
  showNextButton() {
    const nextBtn = document.getElementById("nextButton");
    if (nextBtn) {
      nextBtn.hidden = false; // 去掉 hidden 屬性
      nextBtn.style.display = "block"; // 再保險顯示
    }
  }

  // 讀分數（先讀模組，再讀 cookie）
  _getScoreSafe() {
    // 你的遊戲模組：FoodSharingGame
    if (window.foodSharingGame?.state?.score != null) {
      const s = Number(window.foodSharingGame.state.score);
      if (!Number.isNaN(s)) return s;
    }

    // fallback：cookie
    const raw = document.cookie
      .split("; ")
      .find((r) => r.startsWith("level3_score="))
      ?.split("=")
      .slice(1)
      .join("=");
    return Number(raw) || 0;
  }

  // 回報完成
  completePage(customScore = null, customData = {}) {
    if (this.isCompleted) return;
    this.isCompleted = true;

    const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
    const rawScore =
      customScore !== null ? Number(customScore) : this._getScoreSafe();

    const MAX = 100; // 規範：換算成百分比
    const score = Math.min(
      100,
      Math.max(0, Math.round((rawScore / MAX) * 100))
    );

    // 發送完成訊息給 PlayBoard（在 iframe 裡由父頁接收）
    window.parent.postMessage(
      {
        type: "CUSTOM_PAGE_PROGRESS",
        action: "complete",
        data: {
          completed: true,
          score,
          timeSpent,
          attempts: 1,
          customData: { rawScore, ...customData },
        },
      },
      "*"
    );
  }

  // 進度更新（可選）
  updateProgress(progress, customData = {}) {
    window.parent.postMessage(
      {
        type: "CUSTOM_PAGE_PROGRESS",
        action: "update",
        data: { progress, customData },
      },
      "*"
    );
  }
}

// 全域單例（與範例一致）
window.addEventListener("DOMContentLoaded", () => {
  if (!window.playboard) window.playboard = new PlayBoardProgress();
});
