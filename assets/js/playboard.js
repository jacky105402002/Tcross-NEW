/**
 * PlayBoard 進度控制（最小整合版）
 * - 與模組範例相容：showNextButton()、completePage()
 * - 分數來源：預設讀 window.foodSharingGame.state.score；讀不到則 0
 */
class PlayBoardProgress {
  constructor() {
    this.isCompleted = false;
    this.startTime = Date.now();
    this.setupNextButton();
  }

  // 綁定「下一步」按鈕
  setupNextButton() {
    const nextBtn = document.getElementById("nextButton");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.completePage());
    }
  }

  // 顯示「下一步」按鈕（第 6 頁時呼叫）
  showNextButton() {
    const nextBtn = document.getElementById("nextButton");
    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.style.display = "block";
    }
  }

  // 完成並回報給 PlayBoard
  completePage(customScore = null, customData = {}) {
    if (this.isCompleted) return;

    this.isCompleted = true;
    const timeSpent = Math.round((Date.now() - this.startTime) / 1000);

    // 與範例一致：優先使用 foodSharingGame 的分數
    const game = window.foodSharingGame;
    const finalScore =
      customScore != null
        ? Number(customScore)
        : game
        ? Number(game.state?.score || 0)
        : 0;

    const maxScore = 100;
    const scorePercentage = Math.min(
      100,
      Math.round((finalScore / maxScore) * 100)
    );

    window.parent.postMessage(
      {
        type: "CUSTOM_PAGE_PROGRESS",
        action: "complete",
        data: {
          completed: true,
          score: scorePercentage,
          timeSpent,
          attempts: 1,
          customData: {
            ...customData,
            shareScore: game ? game.state?.score || 0 : 0,
            dumpScore: game ? game.state?.scoreDump || 0 : 0,
            totalItems: game
              ? (game.state?.score || 0) + (game.state?.scoreDump || 0)
              : 0,
          },
        },
      },
      "*"
    );
  }

  // 可選：中途更新進度
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

// 與範例相同：DOMContentLoaded 時建立全域物件
window.addEventListener("DOMContentLoaded", () => {
  window.playboard = new PlayBoardProgress();
});
