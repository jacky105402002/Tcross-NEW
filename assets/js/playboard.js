/**
 * PlayBoard 進度控制（最小穩定版）
 * 分數來源：
 *   1) window.foodSharingGame.state.score
 *   2) 退而求其次：cookie level3_score
 */
class PlayBoardProgress {
  constructor() {
    this.isCompleted = false;
    this.startTime = Date.now();
    this.setupNextButton();
  }

  setupNextButton() {
    const nextBtn = document.getElementById("nextButton");
    if (!nextBtn) return;

    // 一個事件就好（跟官方一致）；行動裝置也會派發 click
    nextBtn.addEventListener("click", () => {
      this.completePage();
    });
  }

  showNextButton() {
    const nextBtn = document.getElementById("nextButton");
    if (nextBtn) {
      // 兩種都做，避免 hidden 還在
      nextBtn.hidden = false;
      nextBtn.style.display = "block";
    }
  }

  _getScore() {
    // 遊戲模組
    if (window.foodSharingGame?.state?.score != null) {
      const s = Number(window.foodSharingGame.state.score);
      if (!Number.isNaN(s)) return s;
    }
    // 退而求其次：cookie
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
    const finalScore =
      customScore !== null ? Number(customScore) : this._getScore();
    const maxScore = 100;
    const scorePercentage = Math.min(
      100,
      Math.round((finalScore / maxScore) * 100)
    );

    const progressData = {
      completed: true,
      score: scorePercentage,
      timeSpent,
      attempts: 1,
      customData: {
        ...customData,
        rawScore: finalScore,
        shareScore: window.foodSharingGame?.state?.score ?? null,
        dumpScore: window.foodSharingGame?.state?.scoreDump ?? null,
      },
    };

    // 回報給父頁（PlayBoard 會接）
    window.parent.postMessage(
      {
        type: "CUSTOM_PAGE_PROGRESS",
        action: "complete",
        data: progressData,
      },
      "*"
    );

    // ---- 本地偵錯（不依賴 alert）：在「自己」視窗也丟一份，方便看 console ----
    try {
      window.postMessage(
        { __debug: "CUSTOM_PAGE_PROGRESS_COMPLETE", data: progressData },
        "*"
      );
    } catch {}
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

// 自動初始化
window.addEventListener("DOMContentLoaded", () => {
  window.playboard = new PlayBoardProgress();

  // 本地偵錯監聽（看得到就表示 click → completePage() 有執行）
  window.addEventListener("message", (ev) => {
    if (ev?.data?.__debug === "CUSTOM_PAGE_PROGRESS_COMPLETE") {
      console.log("[playboard][debug] complete payload =", ev.data.data);
    }
  });
});
