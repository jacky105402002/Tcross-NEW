class PlayBoardProgress {
  constructor() {
    this.isCompleted = false;
    this.startTime = Date.now();
    this.setupNextButton();
  }
  setupNextButton() {
    const nextBtn = document.getElementById("nextButton");
    if (nextBtn) nextBtn.addEventListener("click", () => this.completePage());
  }
  showNextButton() {
    const nextBtn = document.getElementById("nextButton");
    if (nextBtn) {
      nextBtn.hidden = false; // ← 關鍵：把 hidden 拿掉
      nextBtn.style.display = "block";
    }
  }
  completePage(customScore = null, customData = {}) {
    if (this.isCompleted) return;
    this.isCompleted = true;

    const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
    const game = window.foodSharingGame;
    const finalScore =
      customScore !== null ? customScore : game ? game.state.score : 0;
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
        shareScore: game ? game.state.score : 0,
        dumpScore: game ? game.state.scoreDump : 0,
        totalItems: game ? game.state.score + game.state.scoreDump : 0,
      },
    };
    window.parent.postMessage(
      {
        type: "CUSTOM_PAGE_PROGRESS",
        action: "complete",
        data: progressData,
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
window.addEventListener("DOMContentLoaded", () => {
  window.playboard = new PlayBoardProgress();
});
