class Level3Game {
  constructor() {
    // 取得頁面元素
    this.screens = [1, 2, 3, 4, 5, 6].map((n) =>
      document.getElementById(`screen-${n}`)
    );
    this.timerEl = document.getElementById("timer");
    this.scorePill = document.getElementById("scorePill");
    this.spawns = [...document.querySelectorAll(".spawn")];

    // 狀態
    this.GAME_SECONDS = 90;
    this.SHOW_MS = 2000;
    this.timeLeft = this.GAME_SECONDS;
    this.score = 0;
    this.addSum = 0;
    this.cutSumNeg = 0;

    this.gameStarted = false;
    this.resultStarted = false;
    this.result2Started = false;
    this.playing = false;
    this.tickTimer = null;
    this.clearTimers = new Set();
    this.SFX = null;

    // 綁定流程
    this.initialBind();
    this.go(1);
    this.guardFlow();
  }

  // —— 工具（都做成 class 方法，避免外漏到全域）——
  setCookie(name, value, opts = {}) {
    const enc = encodeURIComponent;
    let cookie = `${enc(name)}=${enc(value)}; path=${
      opts.path || "/"
    }; samesite=${opts.sameSite || "Lax"}`;
    if (opts.secure ?? location.protocol === "https:") cookie += "; Secure";
    document.cookie = cookie;
  }
  getCookie(name) {
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
  bindPressSwap(selector, onSrc, offSrc, onClick) {
    const btn = document.querySelector(selector);
    if (!btn) return;
    const img = btn.querySelector("img");
    const on = () => img && (img.src = onSrc);
    const off = () => img && (img.src = offSrc);
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
  handleOrientationMask(maskId) {
    const mask = document.getElementById(maskId);
    if (!mask) return;
    const apply = () => {
      const isPortrait = matchMedia("(orientation: portrait)").matches;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      mask.style.display = isMobile && isPortrait ? "block" : "none";
    };
    apply();
    addEventListener("orientationchange", apply);
    addEventListener("resize", apply);
  }

  // —— 畫面與流程 ——
  go(which) {
    this.screens.forEach((el, idx) => {
      const active = idx + 1 === which;
      el.classList.toggle("is-active", active);
      el.style.display = active ? "block" : "none";
    });
    this.handleOrientationMask(`rotateMask-0${which}`);
    if (which === 6) {
      this.setCookie("level3_06", "true");
      window.playboard?.updateProgress(100, { stage: "l3-06-enter" });
      window.playboard?.showNextButton();
    }
  }
  guardFlow() {
    const p1ok = this.getCookie("level3_01") === "true";
    const p2ok = this.getCookie("level3_02") === "true";
    const p3ok = this.getCookie("level3_03") === "true";
    const p4ok = this.getCookie("level3_04") === "true";
    const p5ok = this.getCookie("level3_05") === "true";
    const hasScore = !Number.isNaN(Number(this.getCookie("level3_score")));
    if (!p1ok) return this.go(1);
    if (!p2ok) return this.go(2);
    if (!p3ok || !hasScore) return this.go(3);
    if (!p4ok) return this.go(4);
    if (!p5ok) return this.go(5);
    return this.go(6);
  }

  initialBind() {
    this.bindPressSwap(
      "#btn-confirm",
      "./assets/images/check_on.png",
      "./assets/images/check_off.png",
      () => {
        this.setCookie("level3_01", "true");
        this.go(2);
      }
    );
    this.bindPressSwap(
      "#btn-confirm-2",
      "./assets/images/check_on.png",
      "./assets/images/check_off.png",
      () => {
        this.setCookie("level3_02", "true");
        this.go(3);
        this.startGameIfNeeded();
      }
    );

    // 防呆委派
    document.addEventListener("click", (e) => {
      const el = e.target.closest(
        "#btn-confirm, #btn-confirm-2, #btn-confirm-4, #btn-confirm-5"
      );
      if (!el) return;
      if (el.id === "btn-confirm") {
        this.setCookie("level3_01", "true");
        this.go(2);
      } else if (el.id === "btn-confirm-2") {
        this.setCookie("level3_02", "true");
        this.go(3);
        this.startGameIfNeeded();
      } else if (el.id === "btn-confirm-4") {
        this.go(5);
        this.startResult2IfNeeded();
      } else if (el.id === "btn-confirm-5") {
        this.go(6);
      }
    });

    // 重新開始
    document.addEventListener("click", (e) => {
      const target = e.target.closest("#btn-restart, .again-game");
      if (!target) return;
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = (eqPos > -1 ? cookie.substr(0, eqPos) : cookie).trim();
        if (name.startsWith("level3_"))
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });
      location.reload();
    });
  }

  // —— Page3 遊戲 ——
  startGameIfNeeded() {
    if (this.gameStarted) return;
    this.gameStarted = true;

    const makeSfxPool = (url, size = 6) => {
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
          } catch {}
          a.play().catch(() => {});
          idx = (idx + 1) % pool.length;
        },
        prime() {
          const a = pool[0],
            v = a.volume;
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
    };

    this.SFX = {
      success: makeSfxPool("./assets/images/success.mp3", 6),
      error: makeSfxPool("./assets/images/error.mp3", 6),
    };
    const unlockAudioOnce = () => {
      this.SFX.success.prime();
      this.SFX.error.prime();
      removeEventListener("pointerdown", unlockAudioOnce);
      removeEventListener("touchstart", unlockAudioOnce);
      removeEventListener("click", unlockAudioOnce);
    };
    addEventListener("pointerdown", unlockAudioOnce, { once: true });
    addEventListener("touchstart", unlockAudioOnce, { once: true });
    addEventListener("click", unlockAudioOnce, { once: true });

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

    this.score = 0;
    this.addSum = 0;
    this.cutSumNeg = 0;
    this.timeLeft = this.GAME_SECONDS;
    this.playing = true;
    this.tickTimer = null;
    this.clearTimers.clear();
    this._refreshScore();

    this.timerEl.textContent = this.timeLeft;
    this._spawnRound(0, ADD_ITEMS, CUT_ITEMS);
    const ROUND_INTERVAL = 2000;
    this.tickTimer = setInterval(() => {
      this.timeLeft -= ROUND_INTERVAL / 1000;
      if (this.timeLeft <= 0) {
        this.timerEl.textContent = 0;
        this._gameOver();
        return;
      }
      this.timerEl.textContent = Math.ceil(this.timeLeft);
      const elapsed = this.GAME_SECONDS - this.timeLeft;
      this._spawnRound(elapsed, ADD_ITEMS, CUT_ITEMS);
    }, ROUND_INTERVAL);
  }

  _getEmptySpawns() {
    return this.spawns.filter((s) => !s.firstElementChild);
  }
  _randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  _countForElapsed(elapsed) {
    if (elapsed < 30) return this._randInt(1, 2);
    else if (elapsed < 60) return this._randInt(2, 3);
    else return this._randInt(3, 5);
  }

  _spawnOne(ADD_ITEMS, CUT_ITEMS) {
    const empties = this._getEmptySpawns();
    if (!empties.length) return false;
    const slot = this._pick(empties);
    const item =
      Math.random() < 0.5 ? this._pick(ADD_ITEMS) : this._pick(CUT_ITEMS);

    const img = document.createElement("img");
    img.src = item.src;
    img.alt =
      item.score > 0 ? `加 ${item.score}` : `扣 ${Math.abs(item.score)}`;
    img.dataset.delta = String(item.score);
    img.addEventListener("pointerdown", (e) => this._onHit(e), { once: true });

    slot.appendChild(img);
    slot.style.display = "block";

    const t = setTimeout(() => {
      if (slot.firstElementChild === img) {
        slot.replaceChildren();
        slot.style.display = "none";
      }
      this.clearTimers.delete(t);
    }, this.SHOW_MS);
    this.clearTimers.add(t);
    return true;
  }

  _spawnRound(elapsed, ADD_ITEMS, CUT_ITEMS) {
    if (!this.playing) return;
    const count = this._countForElapsed(elapsed);
    for (let i = 0; i < count; i++) {
      if (!this._spawnOne(ADD_ITEMS, CUT_ITEMS)) break;
    }
  }

  _onHit(e) {
    if (!this.playing) return;
    const delta = Number(e.currentTarget.dataset.delta || 0);
    this.score += delta;
    if (delta > 0) {
      this.addSum += delta;
      this.SFX?.success.play();
    } else {
      this.cutSumNeg += delta;
      this.SFX?.error.play();
    }
    this._refreshScore();
    this._showScoreHint(e, delta);

    const parent = e.currentTarget.parentElement;
    if (parent) {
      parent.style.display = "none";
      parent.replaceChildren();
    }
  }

  _refreshScore() {
    if (this.scorePill) this.scorePill.textContent = `${this.score}`;
  }

  _showScoreHint(event, delta) {
    const hint = document.createElement("div");
    hint.className = "score-hint " + (delta > 0 ? "pos" : "neg");
    hint.textContent = delta > 0 ? `+${delta}` : `${delta}`;
    document.body.appendChild(hint);
    const x = event.clientX ?? event.touches?.[0]?.clientX ?? 0;
    const y = event.clientY ?? event.touches?.[0]?.clientY ?? 0;
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

  _gameOver() {
    this.playing = false;
    if (this.tickTimer) clearInterval(this.tickTimer);
    for (const t of this.clearTimers) clearTimeout(t);
    this.clearTimers.clear();
    this.spawns.forEach((s) => {
      s.replaceChildren();
      s.style.display = "none";
    });

    this.setCookie("level3_score", String(this.score));
    this.setCookie("level3_add_sum", String(this.addSum));
    this.setCookie("level3_cut_sum_abs", String(Math.abs(this.cutSumNeg)));
    this.setCookie("level3_03", "true");

    this.go(4);
    this.startResultIfNeeded();

    window.playboard?.updateProgress(100, {
      stage: "l3-03-over",
      score: this.score,
      addSum: this.addSum,
      cutSumAbs: Math.abs(this.cutSumNeg),
    });
  }

  startResultIfNeeded() {
    if (this.resultStarted) return;
    this.resultStarted = true;

    this.handleOrientationMask("rotateMask-04");
    const total = Number(this.getCookie("level3_score"));
    if (Number.isNaN(total)) {
      this.go(3);
      return;
    }

    const addSum = Number(this.getCookie("level3_add_sum")) || 0;
    const cutAbs = Number(this.getCookie("level3_cut_sum_abs")) || 0;

    const elAdd = document.getElementById("num-add");
    const elCut = document.getElementById("num-cut");
    const elTotal = document.getElementById("num-total");
    if (elAdd) elAdd.textContent = addSum;
    if (elCut) elCut.textContent = cutAbs;
    if (elTotal) elTotal.textContent = total;

    this.setCookie("level3_04", "true");
    this.bindPressSwap(
      "#btn-confirm-4",
      "./assets/images/check_on.png",
      "./assets/images/check_off.png",
      () => {
        this.go(5);
        this.startResult2IfNeeded();
      }
    );
  }

  startResult2IfNeeded() {
    if (this.result2Started) return;
    this.result2Started = true;
    this.handleOrientationMask("rotateMask-05");
    this.setCookie("level3_05", "true");
    this.bindPressSwap(
      "#btn-confirm-5",
      "./assets/images/check_on.png",
      "./assets/images/check_off.png",
      () => {
        this.go(6);
      }
    );
  }

  // 提供給 playboard.js 讀原始分
  getFinalScore() {
    return Number(this.getCookie("level3_score")) || Number(this.score) || 0;
  }
}

// 初始化（與範例一致）
window.addEventListener("DOMContentLoaded", () => {
  window.level3Game = new Level3Game();
});
