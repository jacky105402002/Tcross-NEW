/**
 * PlayBoard 進度控制
 * - 分數來源：優先讀 window.level3Game.getFinalScore()；沒有就讀 cookie
 */
class PlayBoardProgress {
  constructor() {
    this.isCompleted = false;
    this.startTime = Date.now();
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
      // 有些瀏覽器（特別是行動裝置）會先吃掉 touch 事件，保險起見全擋
      ev.preventDefault();
      ev.stopPropagation();
      // 確認有觸發
      try {
        console.log("[playboard] nextButton pressed");
      } catch {}

      this.completePage();
    };

    // 綁多種事件，確保觸發
    ["click", "pointerup", "touchend"].forEach((type) => {
      nextBtn.addEventListener(type, handler, { passive: false });
    });
  }

  showNextButton() {
    const nextBtn = document.getElementById("nextButton");
    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.style.display = "block";
    }
  }

  _getScoreSafe() {
    if (window.level3Game?.getFinalScore)
      return Number(window.level3Game.getFinalScore()) || 0;
    const raw = document.cookie
      .split("; ")
      .find((r) => r.startsWith("level3_score="))
      ?.split("=")
      .slice(1)
      .join("=");
    return Number(raw) || 0;
  }

  completePage(customScore = null, customData = {}) {
    if (this.isCompleted) return;
    this.isCompleted = true;

    const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
    const rawScore =
      customScore !== null ? Number(customScore) : this._getScoreSafe();

    const maxScore = 100;
    const score = Math.min(
      100,
      Math.max(0, Math.round((rawScore / maxScore) * 100))
    );

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

// 自動初始化成全域單例（與範例一致）
window.addEventListener("DOMContentLoaded", () => {
  if (!window.playboard) window.playboard = new PlayBoardProgress();
});
