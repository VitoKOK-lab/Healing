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

  // ── 特效分級(規格 §6.2):L2 光爆貓撲震動 > L1 金暈星塵;T1 撒花 ──
  function celebrate(card, tier) {
    if (window.LiffFX) {
      LiffFX.celebrate({
        el: $("cardFront"),
        major: card.major,
        keyCard: card.keyCard,
        tier: tier,
      });
    }
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
    // 日抽約 3 秒,兩句就夠;節奏放快一點免得只看到第一句
    var stop = startWaiting($("dailyText"), state.reading && state.reading.cards, 1600);
    fetchReadingText(state.reading.readingId).then(function (r) {
      stop();
      renderDailyText(r.text);
    }, function (e) {
      stop();
      $("dailyText").textContent = "本喵這輪讀不出來,稍後再試喵。";
      throw e;
    });
  }

  function fetchReadingText(readingId, upgrade) {
    var body = { accessToken: state.token, readingId: readingId };
    if (upgrade) body.upgrade = upgrade;
    return api(API.reading, { body: body });
  }

  // ── 等待儀式 ─────────────────────────────────────────
  // 付費深度解讀要寫 350~550 字,實測約 19 秒——那是產文字的固有時間,
  // 換模型省不掉(Kimi 與 Claude 實測同級)。與其讓客人盯著不動的一行字
  // 懷疑當機,不如讓等待本身像「本喵真的在讀牌」:訊息分段推進,而且
  // 唸出他這次抽到的牌名,一看就知道是為他這副牌在忙,不是罐頭轉圈圈。
  function waitingLines(cards) {
    var named = [];
    for (var i = 0; i < (cards || []).length && named.length < 3; i++) {
      if (cards[i] && cards[i].name) named.push(cards[i].name);
    }
    var multi = (cards || []).length > 1;
    var lines = [multi ? "本喵把牌一張一張排開⋯" : "本喵把牌翻過來看⋯"];
    if (named[0]) lines.push("先看「" + named[0] + "」在說什麼⋯");
    if (named[1]) lines.push("再對照「" + named[1] + "」那一張⋯");
    if (named[2]) lines.push("「" + named[2] + "」擺在這裡有意思⋯");
    // 單張牌不能說「幾張牌湊起來」——日抽只抽一張,講出來就穿幫了
    lines.push(multi ? "幾張牌湊起來,線索出來了⋯" : "這張牌想說的,本喵抓到了⋯");
    lines.push("本喵想想怎麼跟你說⋯");
    lines.push("最後一段,快好了⋯");
    return lines;
  }

  // 回傳 stop();呼叫端拿到結果或失敗都要呼叫,否則計時器會繼續跑。
  function startWaiting(el, cards, stepMs) {
    if (!el) return function () {};
    var lines = waitingLines(cards);
    var i = 0;
    el.textContent = lines[0];
    el.classList.add("is-waiting");
    var timer = setInterval(function () {
      i += 1;
      // 跑完最後一句就停在那裡:真的超時的話,停在「快好了」比循環回
      // 開頭更不焦慮(循環會讓人以為卡住重來)。
      if (i >= lines.length) return clearInterval(timer);
      el.textContent = lines[i];
    }, stepMs || 3200);
    return function stop() {
      clearInterval(timer);
      el.classList.remove("is-waiting");
    };
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
    // 分享卡:有牌面資料才開(share.js 需要牌與短評)
    var cards = state.reading && state.reading.cards;
    if (cards && cards.length && window.LiffShare) {
      var shareBtn = $("shareBtn");
      shareBtn.hidden = false;
      shareBtn.onclick = function () {
        shareBtn.disabled = true;
        LiffShare.share(cards[0], text).finally(function () {
          shareBtn.disabled = false;
        });
      };
    }
    var credits = state.credits ? state.credits.deepenCredits : 0;
    $("upsell").hidden = false;
    $("deepenNote").textContent =
      credits > 0
        ? "你有 " + credits + " 點加深額度,這次免費用一點"
        : "NT$20 把這張牌展開成完整解讀";
    $("deepenBtn").disabled = false;
  }

  // 沒額度時先走付款(mock/LINE Pay),成功回來額度 +1 再加深
  function buyDeepen() {
    api("/api/v2/payments/request", {
      body: { accessToken: state.token, kind: "deepen" },
    }).then(function (res) {
      if (!res.ok) {
        $("deepenNote").textContent =
          res.error === "payment_not_available"
            ? "付款功能即將開放,先每天回來抽,連七天送一次免費加深喵"
            : "建立付款失敗,稍後再試喵。";
        return;
      }
      var stub = qs.get("stub");
      location.href = res.paymentUrl + (stub ? "&stub=" + encodeURIComponent(stub) : "");
    });
  }

  function deepen() {
    var credits = state.credits ? state.credits.deepenCredits : 0;
    if (credits <= 0) return buyDeepen();
    $("deepenBtn").disabled = true;
    $("deepenBtn").textContent = "本喵深呼吸中⋯";
    // 深度解讀約 19 秒:先把解讀區開出來跑等待儀式,不要讓客人對著
    // 一顆卡住的按鈕乾等(付了錢還以為當機是最傷的體驗)。
    var box = $("deepReading");
    box.hidden = false;
    box.textContent = "";
    var stop = startWaiting(box, state.reading && state.reading.cards);
    fetchReadingText(state.reading.readingId, "deepen").then(function (r) {
      stop();
      if (!r.ok) {
        box.hidden = true;
        $("deepenBtn").textContent = "加深失敗,再試一次";
        $("deepenBtn").disabled = false;
        return;
      }
      $("upsell").hidden = true;
      box.innerHTML = decorate(r.text);
      refreshCredits();
    }, function (e) {
      stop();
      box.hidden = true;
      $("deepenBtn").textContent = "加深失敗,再試一次";
      $("deepenBtn").disabled = false;
      throw e;
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
