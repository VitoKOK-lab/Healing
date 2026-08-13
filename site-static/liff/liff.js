/* LIFF 版流程引擎(v1 核心迴圈):
 *   進站 → 取身分 → /credits → 日抽切牌 → /draw → 翻牌(特效分級)→
 *   /reading 短評 → 加深 CTA → /reading upgrade=deepen 四段式 → 圖鑑
 *
 * 身分:正式走 LIFF SDK(liff.init → getAccessToken);
 * 開發/測試用 ?stub=<userId>(伺服器 LINE_STUB=1 時放行)。
 * LIFF ID 由 ?liffId= 或 window.LIFF_ID 提供,之後上線時寫死在這裡。
 */
(function () {
  "use strict";

  var API = {
    credits: "/api/v2/credits",
    draw: "/api/v2/draw",
    reading: "/api/v2/reading",
  };

  var qs = new URLSearchParams(location.search);
  var state = {
    token: null,
    credits: null,
    reading: null, // 這次日抽的結果
    cutTouched: false,
  };

  function $(id) { return document.getElementById(id); }

  function show(viewId) {
    ["viewLoading", "viewDraw", "viewReveal", "viewCollection"].forEach(function (id) {
      $(id).hidden = id !== viewId;
    });
    $("navToday").classList.toggle("is-active", viewId !== "viewCollection");
    $("navCollection").classList.toggle("is-active", viewId === "viewCollection");
  }

  function fail(msg) {
    show("viewLoading");
    $("loadingText").textContent = msg;
  }

  // ── 身分 ─────────────────────────────────────────────
  function getToken() {
    var stub = qs.get("stub");
    if (stub) return Promise.resolve("stub:" + stub);

    var liffId = qs.get("liffId") || window.LIFF_ID;
    if (!window.liff || !liffId) {
      return Promise.reject(new Error("no-liff"));
    }
    return liff.init({ liffId: liffId }).then(function () {
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: location.href });
        return new Promise(function () {}); // redirect 中,停在這裡
      }
      return liff.getAccessToken();
    });
  }

  function api(path, options) {
    options = options || {};
    var headers = { "Content-Type": "application/json" };
    if (options.auth !== false) headers.Authorization = "Bearer " + state.token;
    return fetch(path, {
      method: options.body ? "POST" : "GET",
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      return res.json().then(function (data) {
        data.__status = res.status;
        return data;
      });
    });
  }

  // ── 特效分級(規格 §6.2;P6 再加華麗版,這裡是基本盤)──
  function celebrate(card, tier) {
    var front = $("cardFront");
    if (card.keyCard) front.classList.add("fx-key");
    else if (card.major) front.classList.add("fx-major");
    if (tier === "T1") document.body.classList.add("fx-t1");
  }

  // ── 圖鑑 ─────────────────────────────────────────────
  function renderCollection() {
    var seen = (state.credits && state.credits.collection && state.credits.collection.cards) || [];
    var seenSet = {};
    seen.forEach(function (n) { seenSet[n] = true; });
    $("collCount").textContent = String(seen.length);
    var grid = $("collGrid");
    grid.innerHTML = "";
    for (var n = 0; n < 78; n++) {
      var cell = document.createElement("div");
      cell.className = "liff-grid-card" + (seenSet[n] ? "" : " is-locked");
      var img = document.createElement("img");
      var nn = n < 10 ? "0" + n : String(n);
      img.loading = "lazy";
      img.src = "../tarot/assets/cards/" + nn + ".webp";
      img.alt = seenSet[n] ? "已收藏" : "未相遇";
      cell.appendChild(img);
      grid.appendChild(cell);
    }
  }

  // ── 日抽流程 ──────────────────────────────────────────
  function startDraw() {
    show("viewDraw");
    var slider = $("cutSlider");
    var trail = [];

    slider.addEventListener("input", function () {
      state.cutTouched = true;
      trail.push(slider.value);
      if (trail.length > 40) trail.shift();
    });

    function commit() {
      if (!state.cutTouched) return; // 至少要動過一次
      slider.removeEventListener("change", commit);
      doDraw(Number(slider.value) / 1000, trail.join(","));
    }
    slider.addEventListener("change", commit);
  }

  function doDraw(cut, trail) {
    show("viewLoading");
    $("loadingText").textContent = "本喵正在洗牌⋯";
    api(API.draw, {
      body: {
        accessToken: state.token,
        level: "daily",
        gesture: { cut: cut, trail: trail || String(cut) },
      },
    }).then(function (res) {
      if (!res.ok && res.error === "already_drawn_today") {
        return showExisting(res.readingId);
      }
      if (!res.ok) return fail("抽牌失敗了,稍後再試一次喵。");
      state.reading = res;
      updateStats(res.streak, null);
      if (res.streakReward) toastReward();
      reveal(res);
    }).catch(function () {
      fail("連不上本喵,檢查一下網路喵。");
    });
  }

  function reveal(res) {
    var card = res.cards[0];
    show("viewReveal");
    var nn = card.n < 10 ? "0" + card.n : String(card.n);
    $("cardImg").src = "../tarot/assets/cards/" + nn + ".webp";
    $("cardImg").alt = card.name;
    $("cardName").textContent = card.name + (card.orientation === "reversed" ? "(逆位)" : "");
    if (card.orientation === "reversed") $("cardFront").classList.add("is-reversed");

    // 新收藏徽章:抽牌前圖鑑沒有這張才算初次相遇
    var seenBefore =
      state.credits && state.credits.collection &&
      state.credits.collection.cards.indexOf(card.n) !== -1;
    $("newCardBadge").hidden = Boolean(seenBefore);

    setTimeout(function () {
      $("flipWrap").classList.add("is-flipped");
      celebrate(card, res.tier);
      setTimeout(fetchDailyText, 900);
    }, 350);
  }

  function showExisting(readingId) {
    // 今天已抽:把存好的結果(文字+牌面)撈回來重現
    state.reading = { readingId: readingId, cards: null };
    fetchReadingText(readingId).then(function (r) {
      if (!r.ok) return fail("撈不到今天的牌,稍後再試喵。");
      state.reading.cards = r.cards || null;
      show("viewReveal");
      $("newCardBadge").hidden = true;
      if (r.cards && r.cards.length) {
        var card = r.cards[0];
        var nn = card.n < 10 ? "0" + card.n : String(card.n);
        $("cardImg").src = "../tarot/assets/cards/" + nn + ".webp";
        $("cardImg").alt = card.name;
        $("cardName").textContent = card.name + (card.orientation === "reversed" ? "(逆位)" : "");
        if (card.orientation === "reversed") $("cardFront").classList.add("is-reversed");
        $("flipWrap").classList.add("is-flipped"); // 已抽過,直接亮牌不重播儀式
      } else {
        $("flipWrap").style.display = "none";
      }
      renderDailyText(r.text);
    });
  }

  function fetchDailyText() {
    $("dailyReading").hidden = false;
    $("dailyText").textContent = "本喵看牌中⋯";
    fetchReadingText(state.reading.readingId).then(function (r) {
      renderDailyText(r.text);
    });
  }

  function fetchReadingText(readingId, upgrade) {
    var body = { accessToken: state.token, readingId: readingId };
    if (upgrade) body.upgrade = upgrade;
    return api(API.reading, { body: body });
  }

  // 【】重點放大:轉成 <strong>(先 escape 再替換,不吃任何 HTML)
  function decorate(text) {
    var esc = String(text || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return esc.replace(/【([^】]{1,20})】/g, "<strong>$1</strong>");
  }

  function renderDailyText(text) {
    $("dailyReading").hidden = false;
    $("dailyText").innerHTML = decorate(text);
    var credits = state.credits ? state.credits.deepenCredits : 0;
    $("upsell").hidden = false;
    $("deepenNote").textContent =
      credits > 0
        ? "你有 " + credits + " 點加深額度,這次免費用一點"
        : "NT$20 把這張牌展開成完整解讀(付款功能即將開放)";
    $("deepenBtn").disabled = credits <= 0; // P8 金流接上前,只有額度能用
  }

  function deepen() {
    $("deepenBtn").disabled = true;
    $("deepenBtn").textContent = "本喵深呼吸中⋯";
    fetchReadingText(state.reading.readingId, "deepen").then(function (r) {
      if (!r.ok) {
        $("deepenBtn").textContent = "加深失敗,再試一次";
        $("deepenBtn").disabled = false;
        return;
      }
      $("upsell").hidden = true;
      var box = $("deepReading");
      box.hidden = false;
      box.innerHTML = decorate(r.text);
      refreshCredits();
    });
  }

  // ── 狀態列 ────────────────────────────────────────────
  function updateStats(streak, credits) {
    if (streak != null) $("statStreak").textContent = "🐾 " + streak;
    if (credits != null) $("statCredits").textContent = "✦ " + credits;
  }

  function toastReward() {
    var el = document.createElement("div");
    el.className = "liff-newcard";
    el.textContent = "✦ 連抽七天!送你一次免費加深解讀";
    $("viewReveal").insertBefore(el, $("viewReveal").firstChild);
  }

  function refreshCredits() {
    return api(API.credits).then(function (res) {
      if (!res.ok) return null;
      state.credits = res;
      updateStats(res.streak, res.deepenCredits);
      return res;
    });
  }

  // ── 導覽 ─────────────────────────────────────────────
  $("navCollection").addEventListener("click", function () {
    renderCollection();
    show("viewCollection");
  });
  $("navToday").addEventListener("click", function () {
    if (state.reading) show("viewReveal");
    else if (state.credits && state.credits.drawnToday) showExisting(state.credits.todayReadingId);
    else startDraw();
  });
  $("deepenBtn").addEventListener("click", deepen);

  // ── 進站 ─────────────────────────────────────────────
  getToken()
    .then(function (token) {
      state.token = token;
      return refreshCredits();
    })
    .then(function (credits) {
      if (!credits) return fail("登入失敗了,重新開一次喵。");
      if (credits.drawnToday) showExisting(credits.todayReadingId);
      else startDraw();
    })
    .catch(function (err) {
      if (err && err.message === "no-liff") {
        fail("請從 LINE 開啟這個頁面喵。(開發模式:?stub=<userId>)");
      } else {
        fail("進不了場,稍後再試喵。");
      }
    });
})();
