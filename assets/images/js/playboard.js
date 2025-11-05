// assets/js/playboard.js
(function () {
  /* =========================
   *  PlayBoard 進度控制
   * ========================= */
  class PlayBoardProgress {
    constructor() {
      this.isCompleted = false;
      this.startTime = Date.now();
      this._onDomReady(() => this.setupNextButton());
    }
    _onDomReady(cb) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", cb, { once: true });
      } else cb();
    }
    setupNextButton() {
      const n = document.getElementById("nextButton");
      if (n) n.addEventListener("click", () => this.completePage());
    }
    showNextButton() {
      const n = document.getElementById("nextButton");
      if (n) {
        n.hidden = false;
        n.style.display = "block";
      }
    }
    completePage(score = 100, customData = {}) {
      if (this.isCompleted) return;
      this.isCompleted = true;
      const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
      try {
        window.parent.postMessage(
          {
            type: "CUSTOM_PAGE_PROGRESS",
            action: "complete",
            data: {
              completed: true,
              score,
              timeSpent,
              attempts: 1,
              customData,
            },
          },
          "*"
        );
      } catch (e) {
        console.warn("postMessage failed:", e);
      }
    }
    updateProgress(progress, customData = {}) {
      try {
        window.parent.postMessage(
          {
            type: "CUSTOM_PAGE_PROGRESS",
            action: "update",
            data: { progress, customData },
          },
          "*"
        );
      } catch (e) {
        console.warn("postMessage failed:", e);
      }
    }
  }

  if (!window.playboard) {
    window.playboard = new PlayBoardProgress();
  }

  /* =========================
   *  單檔流程與工具（原本第二段 <script>）
   * ========================= */
  // —— 工具：Cookie 與按鈕按壓換圖 ——
  function setCookie(name, value, opts = {}) {
    const enc = encodeURIComponent;
    let cookie = `${enc(name)}=${enc(value)}`;
    cookie += `; path=${opts.path || "/"}`;
    cookie += `; samesite=${opts.sameSite || "Lax"}`;
    if (opts.secure ?? location.protocol === "https:") cookie += "; Secure";
    document.cookie = cookie;
  }
  function getCookie(name) {
    const enc = encodeURIComponent(name) + "=";
    return (
      document.cookie
        .split("; ")
        .find((r) => r.startsWith(enc))
        ?.split("=")
        .slice(1)
        .join("=") || ""
    );
  }
  function bindPressSwap(selector, onSrc, offSrc, onClick) {
    const btn = document.querySelector(selector);
    if (!btn) return;
    const img = btn.querySelector("img");
    const on = () => {
      if (img) img.src = onSrc;
    };
    const off = () => {
      if (img) img.src = offSrc;
    };
    btn.addEventListener("mousedown", on);
    btn.addEventListener("mouseup", off);
    btn.addEventListener("mouseleave", off);
    btn.addEventListener("touchstart", on, { passive: true });
    btn.addEventListener("touchend", off, { passive: true });
    btn.addEventListener("touchcancel", off, { passive: true });
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      onClick?.();
    });
  }
  function handleOrientationMask(maskId) {
    const mask = document.getElementById(maskId);
    if (!mask) return;
    const apply = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      mask.style.display = isMobile && isPortrait ? "block" : "none";
    };
    apply();
    window.addEventListener("orientationchange", apply);
    window.addEventListener("resize", apply);
  }

  // —— 畫面切換（Page 1~6） ——
  const screens = [1, 2, 3, 4, 5, 6].map((n) =>
    document.getElementById(`screen-${n}`)
  );
  function go(which) {
    screens.forEach((el, idx) => {
      const active = idx + 1 === which;
      el.classList.toggle("is-active", active);
      el.style.display = active ? "block" : "none";
    });
    handleOrientationMask(`rotateMask-0${which}`);
    if (which === 6) {
      setCookie("level3_06", "true", { path: "/", sameSite: "Lax" });
      window.playboard?.updateProgress(100, { stage: "l3-06-enter" });
      window.playboard?.showNextButton();
    }
  }

  // —— 流程守門（只回擋） ——
  function guardFlow() {
    const p1ok = getCookie("level3_01") === "true";
    const p2ok = getCookie("level3_02") === "true";
    const p3ok = getCookie("level3_03") === "true";
    const p4ok = getCookie("level3_04") === "true";
    const p5ok = getCookie("level3_05") === "true";
    const hasScore = !Number.isNaN(Number(getCookie("level3_score")));
    if (!p1ok) return go(1);
    if (!p2ok) return go(2);
    if (!p3ok || !hasScore) return go(3);
    if (!p4ok) return go(4);
    if (!p5ok) return go(5);
    return go(6);
  }

  // —— Page 3（遊戲） ——
  let gameStarted = false;
  function startGameIfNeeded() {
    if (gameStarted) return;
    gameStarted = true;

    const DEBUG_HOTSPOTS = false;
    if (DEBUG_HOTSPOTS) document.body.classList.add("show-hotspots");

    handleOrientationMask("rotateMask-03");

    function makeSfxPool(url, size = 4) {
      const pool = Array.from({ length: size }, () => {
        const a = new Audio(url);
        a.preload = "auto";
        a.crossOrigin = "anonymous";
        return a;
      });
      let idx = 0;
      return {
        play() {
          const a = pool[idx];
          try {
            a.currentTime = 0;
          } catch (e) {}
          a.play().catch(() => {});
          idx = (idx + 1) % pool.length;
        },
        prime() {
          const a = pool[0];
          const v = a.volume;
          a.volume = 0;
          a.play()
            .then(() => {
              a.pause();
              a.currentTime = 0;
              a.volume = v;
            })
            .catch(() => {});
        },
      };
    }
    const SFX = {
      success: makeSfxPool("./assets/images/success.mp3", 6),
      error: makeSfxPool("./assets/images/error.mp3", 6),
    };
    function unlockAudioOnce() {
      SFX.success.prime();
      SFX.error.prime();
      window.removeEventListener("pointerdown", unlockAudioOnce);
      window.removeEventListener("touchstart", unlockAudioOnce);
      window.removeEventListener("click", unlockAudioOnce);
    }
    window.addEventListener("pointerdown", unlockAudioOnce, { once: true });
    window.addEventListener("touchstart", unlockAudioOnce, { once: true });
    window.addEventListener("click", unlockAudioOnce, { once: true });

    const GAME_SECONDS = 90;
    const SHOW_MS = 2000;

    const ADD_ITEMS = [
      { src: "./assets/images/add_1.png", score: +2 },
      { src: "./assets/images/add_2.png", score: +2 },
      { src: "./assets/images/add_3.png", score: +2 },
      { src: "./assets/images/add_4.png", score: +3 },
      { src: "./assets/images/add_5.png", score: +3 },
      { src: "./assets/images/add_6.png", score: +3 },
    ];
    const CUT_ITEMS = [
      { src: "./assets/images/cut_1.png", score: -1 },
      { src: "./assets/images/cut_2.png", score: -1 },
      { src: "./assets/images/cut_3.png", score: -1 },
      { src: "./assets/images/cut_4.png", score: -1 },
      { src: "./assets/images/cut_5.png", score: -1 },
      { src: "./assets/images/cut_6.png", score: -2 },
    ];
    [...ADD_ITEMS, ...CUT_ITEMS].forEach((it) => {
      const i = new Image();
      i.src = it.src;
    });

    const spawns = [...document.querySelectorAll(".spawn")];
    const timerEl = document.getElementById("timer");
    const scorePill = document.getElementById("scorePill");

    let score = 0,
      addSum = 0,
      cutSumNeg = 0;
    let timeLeft = GAME_SECONDS;
    let playing = true;
    let tickTimer = null;
    const clearTimers = new Set();

    const refreshScore = () => {
      scorePill.textContent = `${score}`;
    };
    const randInt = (min, max) =>
      min + Math.floor(Math.random() * (max - min + 1));
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const getEmptySpawns = () => spawns.filter((s) => !s.firstElementChild);

    function getCountForElapsed(elapsed) {
      if (elapsed < 30) return randInt(1, 2);
      else if (elapsed < 60) return randInt(2, 3);
      else return randInt(3, 5);
    }

    function spawnOne() {
      const empties = getEmptySpawns();
      if (!empties.length) return false;
      const slot = pick(empties);
      const isAdd = Math.random() < 0.5;
      const item = isAdd ? pick(ADD_ITEMS) : pick(CUT_ITEMS);

      const img = document.createElement("img");
      img.src = item.src;
      img.alt =
        item.score > 0 ? `加 ${item.score}` : `扣 ${Math.abs(item.score)}`;
      img.dataset.delta = String(item.score);
      img.addEventListener("pointerdown", onHit, { once: true });

      slot.appendChild(img);
      slot.style.display = "block";

      const t = setTimeout(() => {
        if (slot.firstElementChild === img) {
          slot.replaceChildren();
          slot.style.display = "none";
        }
        clearTimers.delete(t);
      }, SHOW_MS);
      clearTimers.add(t);
      return true;
    }

    function spawnRound(elapsed) {
      if (!playing) return;
      const count = getCountForElapsed(elapsed);
      for (let i = 0; i < count; i++) {
        if (!spawnOne()) break;
      }
    }

    function startCountdown() {
      timerEl.textContent = timeLeft;
      spawnRound(0);
      const ROUND_INTERVAL = 2000;
      tickTimer = setInterval(() => {
        timeLeft -= ROUND_INTERVAL / 1000;
        if (timeLeft <= 0) {
          timerEl.textContent = 0;
          gameOver();
          return;
        }
        timerEl.textContent = Math.ceil(timeLeft);
        const elapsed = GAME_SECONDS - timeLeft;
        spawnRound(elapsed);
      }, ROUND_INTERVAL);
    }

    function onHit(e) {
      if (!playing) return;
      const delta = Number(e.currentTarget.dataset.delta || 0);
      score += delta;
      if (delta > 0) {
        addSum += delta;
        SFX.success.play();
      } else {
        cutSumNeg += delta;
        SFX.error.play();
      }
      refreshScore();
      showScoreHint(e, delta);
      const parent = e.currentTarget.parentElement;
      if (parent) {
        parent.style.display = "none";
        parent.replaceChildren();
      }
    }

    function showScoreHint(event, delta) {
      const hint = document.createElement("div");
      hint.className = "score-hint " + (delta > 0 ? "pos" : "neg");
      hint.textContent = delta > 0 ? `+${delta}` : `${delta}`;
      document.body.appendChild(hint);
      const x =
        event.clientX ?? (event.touches && event.touches[0]?.clientX) ?? 0;
      const y =
        event.clientY ?? (event.touches && event.touches[0]?.clientY) ?? 0;
      hint.style.left = `${x}px`;
      hint.style.top = `${y}px`;
      requestAnimationFrame(() => {
        hint.style.opacity = "1";
        hint.style.transform = "translate(-50%, calc(-50% - 30px))";
      });
      setTimeout(() => {
        hint.style.opacity = "0";
        hint.style.transform = "translate(-50%, calc(-50% - 60px))";
        setTimeout(() => hint.remove(), 250);
      }, 500);
    }

    function gameOver() {
      playing = false;
      if (tickTimer) clearInterval(tickTimer);
      for (const t of clearTimers) clearTimeout(t);
      clearTimers.clear();
      spawns.forEach((s) => {
        s.replaceChildren();
        s.style.display = "none";
      });

      setCookie("level3_score", String(score), { path: "/", sameSite: "Lax" });
      setCookie("level3_add_sum", String(addSum), {
        path: "/",
        sameSite: "Lax",
      });
      setCookie("level3_cut_sum_abs", String(Math.abs(cutSumNeg)), {
        path: "/",
        sameSite: "Lax",
      });
      setCookie("level3_03", "true", { path: "/", sameSite: "Lax" });

      go(4);
      startResultIfNeeded();
      window.playboard?.updateProgress(100, {
        stage: "l3-03-over",
        score,
        addSum,
        cutSumAbs: Math.abs(cutSumNeg),
      });
    }

    refreshScore();
    startCountdown();
  }

  // —— Page 4（結算1） ——
  let resultStarted = false;
  function startResultIfNeeded() {
    if (resultStarted) return;
    resultStarted = true;

    handleOrientationMask("rotateMask-04");

    const total = Number(getCookie("level3_score"));
    if (Number.isNaN(total)) {
      go(3);
      return;
    }

    const addSum = Number(getCookie("level3_add_sum")) || 0;
    const cutAbs = Number(getCookie("level3_cut_sum_abs")) || 0;

    const elAdd = document.getElementById("num-add");
    const elCut = document.getElementById("num-cut");
    const elTotal = document.getElementById("num-total");
    if (elAdd) elAdd.textContent = addSum;
    if (elCut) elCut.textContent = cutAbs;
    if (elTotal) elTotal.textContent = total;

    setCookie("level3_04", "true", { path: "/", sameSite: "Lax" });

    bindPressSwap(
      "#btn-confirm-4",
      "./assets/images/check_on.png",
      "./assets/images/check_off.png",
      () => {
        go(5);
        startResult2IfNeeded();
      }
    );
  }

  // —— Page 5（結算2） ——
  let result2Started = false;
  function startResult2IfNeeded() {
    if (result2Started) return;
    result2Started = true;

    handleOrientationMask("rotateMask-05");
    setCookie("level3_05", "true", { path: "/", sameSite: "Lax" });

    bindPressSwap(
      "#btn-confirm-5",
      "./assets/images/check_on.png",
      "./assets/images/check_off.png",
      () => {
        go(6);
      }
    );
  }

  /* =========================
   *  啟動與事件委派
   * ========================= */
  function initialBind() {
    // Page 1 → 2
    bindPressSwap(
      "#btn-confirm",
      "./assets/images/check_on.png",
      "./assets/images/check_off.png",
      () => {
        setCookie("level3_01", "true", { path: "/", sameSite: "Lax" });
        go(2);
      }
    );

    // Page 2 → 3
    bindPressSwap(
      "#btn-confirm-2",
      "./assets/images/check_on.png",
      "./assets/images/check_off.png",
      () => {
        setCookie("level3_02", "true", { path: "/", sameSite: "Lax" });
        go(3);
        startGameIfNeeded();
      }
    );

    // 最後防線：事件委派（避免任何意外導致未綁成功）
    document.addEventListener("click", (e) => {
      const el = e.target.closest(
        "#btn-confirm, #btn-confirm-2, #btn-confirm-4, #btn-confirm-5"
      );
      if (!el) return;
      if (el.id === "btn-confirm") {
        setCookie("level3_01", "true", { path: "/", sameSite: "Lax" });
        go(2);
      } else if (el.id === "btn-confirm-2") {
        setCookie("level3_02", "true", { path: "/", sameSite: "Lax" });
        go(3);
        startGameIfNeeded();
      } else if (el.id === "btn-confirm-4") {
        go(5);
        startResult2IfNeeded();
      } else if (el.id === "btn-confirm-5") {
        go(6);
      }
    });

    // 重新開始（第 3 頁 .again-game；第 6 頁 #btn-restart）
    document.addEventListener("click", (e) => {
      const target = e.target.closest("#btn-restart, .again-game");
      if (!target) return;
      // 刪除所有 level3_* cookie
      const cookies = document.cookie.split(";");
      cookies.forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        if (name.trim().startsWith("level3_")) {
          document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      });
      location.reload();
    });

    // 預設進入第 1 頁並檢查流程
    go(1);
    guardFlow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialBind, { once: true });
  } else {
    initialBind();
  }
})();
