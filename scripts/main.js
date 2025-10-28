/* ============================================================
   level3.js  — 共用工具（按鈕互動、RWD 橫式遮罩、Cookie 流程守門）
   ※ 已改用 Cookie（session cookie）取代 LocalStorage
   ============================================================ */

/* ========== Cookie Helpers ========== */
/** 建立 session cookie（關閉瀏覽器即清除） */
function setCookie(name, value, opts = {}) {
  // 預設 path=/
  const path = opts.path || "/";
  const sameSite = opts.sameSite || "Lax";
  const secure = opts.secure ?? location.protocol === "https:";
  const encoded = encodeURIComponent(name) + "=" + encodeURIComponent(value);
  let cookie = `${encoded}; path=${path}; SameSite=${sameSite}`;
  if (secure) cookie += "; Secure"; // HTTPS 才會生效
  // 不設定 expires / max-age，成為 session cookie
  document.cookie = cookie;
}

/** 讀取 cookie 值（不存在回傳 null） */
function getCookie(name) {
  const m = document.cookie.match(
    new RegExp("(?:^|; )" + encodeURIComponent(name) + "=([^;]*)")
  );
  return m ? decodeURIComponent(m[1]) : null;
}

/** 判斷 cookie 值是否為字串 "true" */
function isCookieTrue(name) {
  return getCookie(name) === "true";
}

/** 刪除 cookie（同路徑） */
function deleteCookie(name, opts = {}) {
  const path = opts.path || "/";
  document.cookie =
    encodeURIComponent(name) +
    "=; path=" +
    path +
    "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

/* ========== Route Guards（頁面守門機制） ========== */
/**
 * 若指定 cookie 不為 "true"，就導回 backUrl
 * @param {string} name  cookie 名稱
 * @param {string} backUrl  要導回的頁面（例如 './level3_01.html'）
 */
function requireCookieOrBack(name, backUrl) {
  if (!isCookieTrue(name)) {
    location.replace(backUrl);
  }
}

/* ==========（保留）LocalStorage 安全方法（若仍有舊程式使用） ========== */
/* 共用：安全存取 LocalStorage */
function safeSetLocal(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (e) {
    /* ignore */
  }
}
function safeGetLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

/* ========== 圖片按鈕：按下切換 On，放開回 Off，點擊呼叫 callback ========== */
function bindPressSwap(selector, onSrc, offSrc, onClick) {
  const btn = document.querySelector(selector);
  if (!btn) return;
  const img = btn.querySelector("img");

  const press = () => {
    img && (img.src = onSrc);
  };
  const release = () => {
    img && (img.src = offSrc);
  };

  // 滑鼠
  btn.addEventListener("mousedown", press);
  btn.addEventListener("mouseup", release);
  btn.addEventListener("mouseleave", release);

  // 觸控
  btn.addEventListener(
    "touchstart",
    () => {
      press();
    },
    { passive: true }
  );
  btn.addEventListener(
    "touchend",
    () => {
      release();
    },
    { passive: true }
  );
  btn.addEventListener(
    "touchcancel",
    () => {
      release();
    },
    { passive: true }
  );

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    if (typeof onClick === "function") onClick();
  });
}

/* ========== 手機/平板限定橫式：直式顯示遮罩 ========== */
function handleOrientationMask() {
  const mask = document.getElementById("rotateMask");
  const check = () => {
    const isMobileOrTablet = /Android|iPhone|iPad|iPod/i.test(
      navigator.userAgent
    );
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    if (isMobileOrTablet && isPortrait) {
      mask && (mask.style.display = "block");
    } else {
      mask && (mask.style.display = "none");
    }
  };
  check();
  window.addEventListener("orientationchange", check);
  window.addEventListener("resize", check);
}

/* ===== Fullscreen helpers ===== */
function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
}

function enterFullscreen(el = document.documentElement) {
  const req =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.msRequestFullscreen;
  return req
    ? req.call(el)
    : Promise.reject(new Error("Fullscreen not supported"));
}

/**
 * 在第一次「點擊/觸控」時嘗試全螢幕。
 * @param {string|Element|null} target 綁定事件的目標；不傳就綁整個 document
 */
function attachAutoFullscreen(target = null) {
  const el =
    typeof target === "string"
      ? document.querySelector(target)
      : target || document;

  if (!el) return;

  const handler = () => {
    if (!isFullscreen()) {
      enterFullscreen(document.documentElement).catch(() => {
        /* 使用者或瀏覽器拒絕就忽略 */
      });
    }
  };

  // 只嘗試一次，避免干擾你的其他點擊
  const onceWrap = (e) => {
    handler();
    el.removeEventListener("click", onceWrap);
    el.removeEventListener("touchend", onceWrap);
  };

  el.addEventListener("click", onceWrap, { once: true });
  el.addEventListener("touchend", onceWrap, { once: true, passive: true });
}

/* 讓其他頁面也能呼叫 */
window.isFullscreen = isFullscreen;
window.enterFullscreen = enterFullscreen;
window.attachAutoFullscreen = attachAutoFullscreen;

/* ===== 導出到全域（若需要在 inline script 直接呼叫） ===== */
window.setCookie = setCookie;
window.getCookie = getCookie;
window.isCookieTrue = isCookieTrue;
window.deleteCookie = deleteCookie;
window.requireCookieOrBack = requireCookieOrBack;
window.bindPressSwap = bindPressSwap;
window.handleOrientationMask = handleOrientationMask;
/* （可選）保留 LocalStorage 便於相容舊碼 */
window.safeSetLocal = safeSetLocal;
window.safeGetLocal = safeGetLocal;
