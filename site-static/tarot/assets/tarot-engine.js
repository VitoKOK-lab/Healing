/* TAHIR ZAINAB TAROT — 占卜引擎(桌機版與手機版共用)
   ────────────────────────────────────────────────────────────
   這支檔案原本是 tarot-desktop.html 裡的 inline script。切成獨立站
   之後,桌機版(desk.html)與手機版(index.html)共用同一份流程:
   選主題 → 追問情境 → 打問題 → 洗牌 → 切牌 → 翻牌 → 解讀 → 推寶石。

   兩個版面的差別只有三件事,全部集中在下面的 MODE 分支,不要散到別處:
     1. 額度 —— desk 是店主現場用的工具,不計次;phone 是客人自己玩的,
        照原本的付費規則走(抽完三次要加購)。
     2. QR —— 「傳給客人」只有店主端需要,手機版藏起來。
     3. 品牌連結 —— 點標題重新開始,兩邊各自回自己那一頁。

   兩個版面的 HTML 刻意保持同一套 id,這樣引擎不必到處做 null 判斷。
   版面差異一律交給 CSS(desk.css / mobile.css)處理。
   ──────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", function () {
  // desk = 店主現場用的桌機版;phone = 客人自己玩的手機版
  var MODE = document.body.dataset.mode === "phone" ? "phone" : "desk";
  var IS_DESK = MODE === "desk";

  var creditsText = document.getElementById("creditsText");
  var creditsBadge = document.getElementById("creditsBadge");
  var lockedPanel = document.getElementById("lockedPanel");
  var tarotFlow = document.getElementById("tarotFlow");
  var catDialogue = document.getElementById("catDialogue");
  var dialogueAvatar = document.getElementById("dialogueAvatar");
  var dialogueText = document.getElementById("dialogueText");
  var dialogueCaret = document.getElementById("dialogueCaret");
  var topicPanel = document.getElementById("topicPanel");
  var scenarioPanel = document.getElementById("scenarioPanel");
  var scenarioList = document.getElementById("scenarioList");
  var shufflePanel = document.getElementById("shufflePanel");
  var swipeStage = document.getElementById("swipeStage");
  var swipeTrail = document.getElementById("swipeTrail");
  var swipeFill = document.getElementById("swipeFill");
  var swipeMeter = document.getElementById("swipeMeter");
  var swipeHint = document.getElementById("swipeHint");
  var cutPanel = document.getElementById("cutPanel");
  var cutStage = document.getElementById("cutStage");
  var cutLeft = document.getElementById("cutLeft");
  var cutRight = document.getElementById("cutRight");
  var cutSeam = document.getElementById("cutSeam");
  var cutUpperCount = document.getElementById("cutUpperCount");
  var cutLowerCount = document.getElementById("cutLowerCount");
  var cutHint = document.getElementById("cutHint");
  var questionPanel = document.getElementById("questionPanel");
  var questionField = document.getElementById("questionField");
  var optionPanel = document.getElementById("optionPanel");
  var optionA = document.getElementById("optionA");
  var optionB = document.getElementById("optionB");
  var optionHint = document.getElementById("optionHint");
  var clarifyPanel = document.getElementById("clarifyPanel");
  var clarifyInput = document.getElementById("clarifyInput");
  var clarifyHint = document.getElementById("clarifyHint");
  var clarifyBtn = document.getElementById("clarifyBtn");
  var thinkingPanel = document.getElementById("thinkingPanel");
  var questionInput = document.getElementById("questionInput");
  var questionHint = document.getElementById("questionHint");
  var drawBtn = document.getElementById("drawBtn");
  var drawOverlay = document.getElementById("drawOverlay");
  var drawVideo = document.getElementById("drawVideo");
  var tarotDeck = document.getElementById("tarotDeck");
  // 桌面版版面會隨階段改變:抽牌前單欄置中,抽牌後才展開成左右兩欄。
  // 沒有這個切換的話,選主題到切牌的整段流程右半邊都是空的。
  var tarotFlow = document.getElementById("tarotFlow");
  var resultPanel = document.getElementById("resultPanel");
  var cardSummary = document.getElementById("cardSummary");
  var loadingNote = document.getElementById("loadingNote");
  var errorNote = document.getElementById("errorNote");
  var readingSummary = document.getElementById("readingSummary");
  var summaryList = document.getElementById("summaryList");
  var retryBtn = document.getElementById("retryBtn");
  var againBtn = document.getElementById("againBtn");
  var reportBtn = document.getElementById("reportBtn");
  var qrBtn = document.getElementById("qrBtn");
  var gemPick = document.getElementById("gemPick");
  var lastGem = null;
  var qrCloseBtn = document.getElementById("qrCloseBtn");
  var qrNextBtn = document.getElementById("qrNextBtn");
  var soundToggle = document.getElementById("soundToggle");
  var soundLabel = document.getElementById("soundLabel");

  var topic = null;
  var scenario = null;
  var lastCards = null;
  var lastSpread = null;
  // 記下這一輪的兩個選項,「請本喵再看一次」重送時才不會漏掉
  var lastOptions = null;
  var lastReading = "";
  var refunded = false;
  var usedFallback = false;
  // 客人自己滑出來的種子:洗牌軌跡長度 + 切牌位置,決定抽到哪幾張牌
  var swipeDistance = 0;
  var cutPoint = 0.5;
  // 自由發問時本喵挑好牌陣要說的那句話,抽牌前才講
  var autoPickedLine = null;

  var TOPIC_REPLY = {
    love: "感情的事啊⋯⋯本喵最懂了。",
    career: "工作上的煩惱嗎?讓本喵看看。",
    money: "金錢的來去,牌面看得很清楚。",
    decision: "在猶豫對不對?那就讓牌推你一把。",
    other: "嗯,說來聽聽吧。"
  };

  // 選好處境後,本喵順口說明這次會怎麼看牌——客人不必知道「牌陣」這個詞
  var SPREAD_REPLY = {
    single: "這種事不用翻太多牌,本喵抽一張,直接告訴你重點。",
    flow: "那本喵要看的是【來龍去脈】——從前因、現在,一路看到接下來的走向。",
    choice: "兩條路都得看過才公平。本喵會把兩邊的過程跟結果一起攤開給你。",
    relation: "兩個人的事,得【兩邊都看】。本喵會把你的心跟對方的心一起排出來。",
    celtic: "這件事得攤開來看。本喵用【十張牌】把它從裡到外排一遍,會花點時間。",
    tree: "要認識自己,本喵得把【整棵生命之樹】排出來,十一張,一層一層往下走。",
    auto: "那你直接說吧,想問什麼都可以。本喵聽完再決定要怎麼排牌。"
  };

  // 自由發問判斷完牌陣後,本喵再說一次要怎麼看——客人才知道發生了什麼事
  var AUTO_PICKED = {
    single: "這件事本喵抽【一張】就夠了,直接給你重點。",
    flow: "聽起來要看的是【來龍去脈】,本喵用三張排一條時間線。",
    choice: "你這是在【兩條路之間】猶豫吧?那把兩條路都寫給本喵看看。",
    relation: "這牽扯到【另一個人】,本喵把你的心跟對方的心一起排出來。",
    celtic: "這件事不簡單,本喵用【十張牌】從裡到外幫你排一遍。",
    tree: "想看清自己啊⋯⋯那本喵排【整棵生命之樹】,十一張。"
  };

  // ── 兩種標記 ────────────────────────────────────────
  // 【】= 對客人有意義的重點,放大變色
  // 〔〕= 牌名出處(例如〔寶劍八逆位〕),做成小標籤,讓人一眼看出這句話的根據
  function toSegs(line) {
    var segs = [], cur = "", kind = "";
    function flush() { if (cur) segs.push({ t: cur, k: kind }); cur = ""; }
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === "【" || ch === "〔") { flush(); kind = ch === "【" ? "hi" : "ref"; continue; }
      if (ch === "】" || ch === "〕") { flush(); kind = ""; continue; }
      cur += ch;
    }
    flush();
    return segs;
  }

  function segsLength(segs) {
    return segs.reduce(function (n, s) { return n + s.t.length; }, 0);
  }

  // 只顯示前 n 個字(打字用);框起來的部分包成 <em class="hi">
  function renderSegs(segs, n) {
    var out = "", left = n;
    for (var i = 0; i < segs.length && left > 0; i++) {
      var part = segs[i].t.slice(0, left);
      left -= part.length;
      var esc = part.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      if (segs[i].k === "hi") out += '<em class="hi">' + esc + "</em>";
      else if (segs[i].k === "ref") out += '<em class="card-ref">' + esc + "</em>";
      else out += esc;
    }
    return out;
  }

  // ── 對話引擎 ────────────────────────────────────────
  // 流程中的短對話自動往下走(manual=false),不必一直點。
  // 只有解牌那段字多、要慢慢讀,才改成點一下才換下一句(manual=true)。
  // 兩種模式下,最後一句講完都直接收尾——那時已經沒有下一句,
  // 再叫人「點一下繼續」只會讓人卡在那裡不知道要繼續去哪。
  var typeTimer = null;

  // ── 節奏 ──────────────────────────────────────────
  // 現場是一個客人接一個排隊,每一段等待都會乘上人數。
  // 這幾個數字是整場體驗快慢的總開關,要調就調這裡。
  var TYPE_MS = 22;        // 每個字的打字間隔(原 42)
  var LINE_GAP_MS = 420;   // 句與句之間的停頓(原 900)

  function speak(lines, onDone, manual) {
    clearTimeout(typeTimer);
    catDialogue.style.display = "block";
    var li = 0, ci = 0, typing = false, done = false;

    function isLast() { return li >= lines.length - 1; }

    function finish() {
      if (done) return;
      done = true;
      catDialogue.onclick = null;
      document.removeEventListener("click", onAnywhere);
      dialogueCaret.style.display = "none";
      if (onDone) onDone();
    }

    // 一句講完:最後一句直接收尾;中間的句子在解牌模式等客人點,其餘自動往下
    function lineDone() {
      typing = false;
      if (isLast()) { finish(); return; }
      if (manual) dialogueCaret.style.display = "";
      else typeTimer = setTimeout(next, LINE_GAP_MS);
    }

    function typeLine() {
      typing = true;
      dialogueCaret.style.display = "none";
      dialogueText.innerHTML = "";
      ci = 0;
      var segs = toSegs(lines[li]);
      var total = segsLength(segs);
      (function step() {
        if (ci >= total) { lineDone(); return; }
        dialogueText.innerHTML = renderSegs(segs, ++ci);
        if (ci % 2 === 0) Tarot.Sound.blip(940 + (ci % 3) * 45);
        typeTimer = setTimeout(step, TYPE_MS);
      })();
    }

    function next() {
      clearTimeout(typeTimer);
      li += 1;
      if (li >= lines.length) finish();
      else typeLine();
    }

    // 點一下:打字中就把這句補完(最後一句補完即收尾),打完了才換下一句
    function advance() {
      if (typing) {
        clearTimeout(typeTimer);
        var segs = toSegs(lines[li]);
        dialogueText.innerHTML = renderSegs(segs, segsLength(segs));
        lineDone();
      } else {
        next();
      }
    }

    // 本喵在講話時,整個畫面都是「繼續」的按鈕——不必特地瞄準那行小字。
    // 但按鈕、輸入框、洗牌切牌區、影片遮罩有自己的事要做,不搶它們的點擊。
    function onAnywhere(e) {
      if (e.target.closest("button, a, input, textarea, select, label, " +
                           "#swipeStage, #cutStage, .draw-overlay")) return;
      advance();
    }

    document.addEventListener("click", onAnywhere);

    typeLine();
  }

  function splitSentences(text) {
    var parts = text.trim().match(/[^。！？!?\n]+[。！？!?]?/g) || [text];
    return parts.map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // ── 額度 ──────────────────────────────────────────
  // 桌機版是店主拿著螢幕在現場一位接一位玩的工具,不計次、不需儲值。
  // 手機版是客人自己玩的,照原本的付費規則走:抽完免費次數要加購。
  // 額度那一套邏輯完整留在 tarot-data.js,這裡只決定要不要走它。
  function updateCredits() {
    if (IS_DESK) {
      creditsBadge.style.display = "none";   // 不計次就不該顯示「剩餘 N 次」
      return;
    }
    creditsText.textContent = "剩餘 " + Tarot.getCredits() + " 次";
  }

  // 擋在「要開始新的一輪」之前:沒次數就直接顯示購買頁,
  // 不讓客人白花力氣選主題、打字、看完動畫才被擋下來。
  function canStartRound() {
    updateCredits();
    var ok = IS_DESK || Tarot.getCredits() > 0;
    lockedPanel.style.display = ok ? "none" : "block";
    // 桌機版的 #tarotFlow 是 grid(左牌桌右解讀),手機版是單欄
    tarotFlow.style.display = ok ? (IS_DESK ? "grid" : "block") : "none";
    return ok;
  }

  // ── 音效開關 ───────────────────────────────────────
  // 背景音樂:不另外做暫停鈕,跟著既有的音效開關走。
  // 自動播放又完全關不掉對訪客很不友善,而這個開關本來就在畫面上,不必多一顆。
  var bgm = document.getElementById("bgm");

  function startBgm() {
    if (!bgm || !Tarot.Sound.isOn()) return;
    bgm.volume = 0.28;              // 墊底用,不能蓋過本喵講話的音效
    var p = bgm.play();
    if (p && p.catch) p.catch(function () {});   // 被瀏覽器擋下就算了,不影響占卜
  }

  function paintSound() {
    var on = Tarot.Sound.isOn();
    soundToggle.classList.toggle("off", !on);
    soundToggle.setAttribute("aria-pressed", String(on));
    soundLabel.textContent = on ? "呼嚕聲" : "已靜音";
    soundToggle.querySelector(".wave").style.display = on ? "" : "none";
    soundToggle.querySelector(".cross").style.display = on ? "none" : "";
    if (bgm) {
      if (on) startBgm();
      else bgm.pause();
    }
  }
  soundToggle.addEventListener("click", function () { Tarot.Sound.toggle(); paintSound(); });

  // ── 第一步:本喵先開口,說完才給選主題 ────────────────────
  // 收掉這一步的畫面時,本喵那句話也要一起收掉——那句話是講給這一步聽的。
  // 留著它會變成:客人已經切完牌、影片都播完了,上面還寫著「換你切牌」。
  // 下一步要說話的地方都會呼叫 speak(),那裡會自己把對話框開回來。
  function hideStages() {
    clearTimeout(typeTimer);
    catDialogue.onclick = null;
    dialogueCaret.style.display = "none";
    catDialogue.style.display = "none";
    topicPanel.style.display = "none";
    scenarioPanel.style.display = "none";
    questionPanel.style.display = "none";
    clarifyPanel.style.display = "none";
    thinkingPanel.style.display = "none";
    shufflePanel.style.display = "none";
    cutPanel.style.display = "none";
  }

  function showStage(panel) {
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function startIntro() {
    hideStages();
    tarotDeck.style.display = "none";
    tarotDeck.innerHTML = "";
    tarotDeck.className = "tarot-deck";
    if (tarotFlow) tarotFlow.classList.remove("has-cards");
    resultPanel.classList.remove("show");
    speak([
      "歡迎光臨解憂商店,本喵是這裡的占卜師。",
      "把心裡放不下的事交給我,牌會告訴你答案。",
      "先說說看,今天想問的是哪方面呢?"
    ], function () {
      showStage(topicPanel);
    });
  }

  // ── 第二步:選主題,本喵回話,再問具體是哪一種處境 ────────────
  document.querySelectorAll(".topic-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".topic-chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      topic = chip.dataset.topic;
      scenario = null;
      scenarioPanel.style.display = "none";
      questionPanel.style.display = "none";
      buildScenarios(topic);
      speak([TOPIC_REPLY[topic], "再說得細一點,是下面哪一種呢?"], function () {
        showStage(scenarioPanel);
      });
    });
  });

  // ── 第三步:選處境,由它決定用哪個牌陣 ───────────────────────
  function buildScenarios(t) {
    scenarioList.innerHTML = "";
    (Tarot.SCENARIOS[t] || Tarot.SCENARIOS.other).forEach(function (s) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scenario-item";
      btn.dataset.id = s.id;
      var tag = s.spread === "auto"
        ? "本喵幫你決定"
        : Tarot.SPREADS[s.spread].positions.length + " 張・" + Tarot.SPREADS[s.spread].name;
      btn.innerHTML = '<span class="scenario-label">' + s.label + "</span>" +
        '<span class="scenario-spread">' + tag + "</span>";
      btn.addEventListener("click", function () {
        scenarioList.querySelectorAll(".scenario-item").forEach(function (x) { x.classList.remove("active"); });
        btn.classList.add("active");
        // 每次重選處境都從乾淨狀態開始(auto 會在抽牌前改寫 spread)
        scenario = { id: s.id, label: s.label, spread: s.spread };
        questionPanel.style.display = "none";
        // 二擇一只留兩個選項欄,問題欄收起來——三個格子會讓人不知道該填哪個
        var isChoice = s.spread === "choice";
        optionPanel.style.display = isChoice ? "grid" : "none";
        questionField.style.display = isChoice ? "none" : "block";
        speak([
          SPREAD_REPLY[s.spread],
          isChoice
            ? "把你在猶豫的兩條路各寫一句給本喵看。"
            : s.spread === "auto"
              ? "想問什麼都可以,寫下來給本喵看。"
              : "那麼,把你想問的事寫下來給本喵看吧。"
        ], function () {
          showStage(questionPanel);
          (isChoice ? optionA : questionInput).focus();
        });
      });
      scenarioList.appendChild(btn);
    });
  }

  // ── 第三步:至少五個字,不夠本喵會提醒 ─────────────────────
  function questionIsReady() {
    // 二擇一沒有問題欄,問題由兩個選項組成,這條規則不適用
    if (scenario && scenario.spread === "choice") return true;
    var q = questionInput.value.trim();
    if (q.length >= 5) {
      questionHint.textContent = "至少寫五個字。本喵只看得到最近三個月喔";
      questionHint.classList.remove("is-error");
      questionInput.classList.remove("is-error");
      return true;
    }
    questionHint.textContent = "你說的有點少,再多寫一點讓本喵聽清楚";
    questionHint.classList.add("is-error");
    questionInput.classList.add("is-error");
    questionInput.focus();
    return false;
  }

  questionInput.addEventListener("input", function () {
    if (questionHint.classList.contains("is-error") && questionInput.value.trim().length >= 5) {
      questionIsReady();
    }
  });

  // 二擇一沒填兩個選項就沒得比,擋在抽牌前
  function chosenOptions() {
    if (!scenario || scenario.spread !== "choice") return null;
    var a = optionA.value.trim(), b = optionB.value.trim();
    return a.length >= 2 && b.length >= 2 ? { a: a, b: b } : null;
  }

  // 二擇一沒有問題欄,問題直接用兩個選項組出來送給本喵
  function questionText() {
    if (lastOptions) {
      return "我在「" + lastOptions.a + "」和「" + lastOptions.b + "」之間猶豫,該怎麼選?";
    }
    return questionInput.value;
  }

  function optionsAreReady() {
    if (!scenario || scenario.spread !== "choice") return true;
    if (chosenOptions()) {
      optionHint.textContent = "兩邊都寫一下,本喵才知道要比什麼";
      optionHint.classList.remove("is-error");
      optionA.classList.remove("is-error");
      optionB.classList.remove("is-error");
      return true;
    }
    optionHint.textContent = "兩條路都寫上來,本喵才有得比較喔";
    optionHint.classList.add("is-error");
    var aOk = optionA.value.trim().length >= 2;
    var bOk = optionB.value.trim().length >= 2;
    if (!aOk) optionA.classList.add("is-error");
    if (!bOk) optionB.classList.add("is-error");
    (aOk ? optionB : optionA).focus();
    return false;
  }

  [optionA, optionB].forEach(function (el) {
    el.addEventListener("input", function () {
      if (optionHint.classList.contains("is-error") && chosenOptions()) optionsAreReady();
    });
  });

  // 寬螢幕播橫式版本,直式螢幕播直式版本——這樣兩邊都看得到完整畫面。
  // 播放中不換,免得把正在看的影片打斷。
  var drawSrcWebm = document.getElementById("drawSrcWebm");
  var drawSrcMp4 = document.getElementById("drawSrcMp4");

  // 新的橫式洗牌影片只有 mp4,沒有 webm;直式仍沿用舊的三件組。
  // 洗牌影片有橫式與直式兩版,依畫面比例自動挑,不看是哪一頁——
  // 桌機幾乎一定是橫的、手機直握一定是直的,而平板轉向時也會跟著換。
  //
  // 要換直式影片,把新檔放進 assets/videos/ 之後改這裡的 portrait 就好:
  //   mp4    直式洗牌影片(必要)
  //   webm   同一支的 webm 版,沒有就留空字串,程式會直接跳過不撞 404
  //   poster 影片載入前先顯示的靜態圖,避免黑畫面
  // ── 影片預先抓下來 ──────────────────────────────────────────
  // preload="auto" 只是「建議」,iOS Safari 基本上不理它——真的要等到
  // play() 被呼叫才開始下載。結果就是:客人點下去,影片才開始抓,
  // 手機網路慢一點就播到一半 stall 住,畫面停在某一格。
  //
  // 所以自己抓。頁面一載入就在背景把接下來會用到的影片整包 fetch 回來,
  // 讓它進到瀏覽器的 HTTP 快取。等到真的要播時,<video> 直接從快取讀,
  // 不必再等網路。
  //
  // 注意:抓回來之後「不要」把 <video> 的 src 換成 blob URL。試過,
  // iOS Safari 上會卡住不播——Safari 的影片載入是走 range request 的,
  // 而 blob URL 對 range 的支援很差,常常整個停在那裡,連 error 事件
  // 都不發。用一般網址 + 已經暖好的快取,效果一樣而且到處都能跑。
  //
  // 順序是照「會用到的先後」排的,而且一支抓完才抓下一支:
  //   1. 進場影片:客人隨時可能點下去,最急
  //   2. 洗牌影片:大概三十秒到一分鐘後才會用到
  // 不併行是因為手機頻寬有限,兩支一起搶只會兩支都慢。
  // 等待影片不在名單裡——它 autoplay,瀏覽器自己就會抓。
  var videoReady = {};          // 檔名 → 已經抓進快取了

  function videoUrl(name) {
    return "./assets/videos/" + name;
  }

  function prefetchVideo(name) {
    if (videoReady[name]) return Promise.resolve();
    return fetch("./assets/videos/" + name)
      // 一定要把 body 讀完,只拿到 headers 是不會進快取的
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.blob();
      })
      .then(function () { videoReady[name] = true; })
      // 抓不到就算了:播的時候照原本的方式走,行為跟加預抓之前一樣
      .catch(function () {});
  }

  var SHUFFLE = {
    wide:     { mp4: "tarot-shuffle.mp4", webm: "", poster: "tarot-draw-wide-poster.jpg" },
    portrait: { mp4: "tarot-shuffle-portrait.mp4", webm: "", poster: "tarot-shuffle-portrait-poster.jpg" }
  };

  function pickVideo() {
    var wide = window.matchMedia("(min-aspect-ratio: 1/1)").matches;
    var base = wide ? "wide" : "portrait";
    if (drawVideo.dataset.base === base) return;
    if (drawOverlay.style.display !== "none") return;
    drawVideo.dataset.base = base;
    var v = SHUFFLE[base];
    // 沒有 webm 就把來源拿掉,瀏覽器才會直接跳到 mp4,而不是先撞一個 404
    if (v.webm) drawSrcWebm.src = videoUrl(v.webm);
    else drawSrcWebm.removeAttribute("src");
    // 已經預抓好就用 blob(不碰網路),還沒抓好就先掛原本的網址,
    // 抓完之後 startPrefetch() 會再叫一次 pickVideo() 換上來
    drawSrcMp4.src = videoUrl(v.mp4);
    drawVideo.poster = "./assets/videos/" + v.poster;
    // 不在這裡 load():preload="none" 加上不呼叫 load(),瀏覽器就不會
    // 主動去抓,背景那支 prefetch 才不會跟它撞成同一支下載兩次。
    // 真的要播的時候 playDraw() 會 play(),那時檔案已經在快取裡了。
  }
  window.addEventListener("resize", pickVideo);

  // iOS 只允許「使用者手勢當下」開始播放。洗牌影片是等本喵說完話才播,
  // 中間隔了 setTimeout,手勢就失效了。所以在按下的當下先播一下再暫停,
  // 把洗牌影片「解鎖」,稍後才能程式化播放。它是等本喵說完話才播的,
  // 那時已經脫離使用者手勢,iOS 會擋下來,所以要趁這一下先解鎖。
  //
  // 這裡踩過一個很痛的雷:原本是 play() 之後在 .then() 裡才 pause(),
  // 而且同時解鎖洗牌與唱歌兩支。iOS 同一時間只准一支影片播放——那兩支
  // 一搶,緊接著要播的進場影片就被凍住不動,但唱歌那支的聲音還在放。
  // 店主現場遇到的就是這個:「卡住會發出唱歌的聲音」。
  //
  // 現在只解鎖洗牌那一支,而且 play() 之後「立刻同步」pause(),
  // 讓它連一格都不要真的播出去——iOS 仍然會把這個元素記成已授權。
  function unlockVideo() {
    try {
      var p = drawVideo.play();
      drawVideo.pause();               // 同步暫停,不要跟進場影片搶播放權
      drawVideo.currentTime = 0;
      if (p && p.catch) p.catch(function () {});   // 被立刻 pause 會 reject,正常
    } catch (e) {}
  }

  // 自由發問:先看懂客人問什麼,才決定用哪個牌陣。判斷成二擇一時要回頭
  // 跟客人要那兩條路,不能自己編。
  function resolveAutoSpread() {
    if (!scenario || scenario.spread !== "auto") return true;
    var picked = Tarot.guessSpread(questionInput.value);
    scenario.spread = picked;
    autoPickedLine = AUTO_PICKED[picked] || null;
    if (picked === "choice") {
      autoPickedLine = null;   // 這句下面就會講,不要等到抽牌前再講一次
      optionPanel.style.display = "grid";
      questionField.style.display = "none";
      speak([AUTO_PICKED.choice], function () {
        showStage(questionPanel);
        optionA.focus();
      });
      return false;   // 這一輪先不抽,等客人補完兩條路
    }
    return true;
  }

  // ── 不適合用塔羅問的題目 ─────────────────────────────
  // 一定要擋在扣點數之前:這種問題塔羅給不出負責任的答案,
  // 收了錢再給一段模稜兩可的話,對客人沒有好處。
  function handleUnsuitable() {
    var q = questionInput.value + " " + optionA.value + " " + optionB.value;
    var hit = Tarot.unsuitable(q);
    if (!hit) return false;

    hideStages();

    // 全部重來:清空欄位、回到第一步重新發問。全程沒扣點數。
    function restart() {
      questionInput.value = "";
      optionA.value = "";
      optionB.value = "";
      topic = null;
      scenario = null;
      lastOptions = null;
      autoPickedLine = null;
      document.querySelectorAll(".topic-chip").forEach(function (c) { c.classList.remove("active"); });
      startIntro();
      catDialogue.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // 本來這裡會播一支「唱歌賠罪」的影片才重來。那支影片已經移除:
    // 它是店主現場卡住的元凶(見 unlockVideo 的說明),而且對客人來說,
    // 被拒絕之後還要看十秒動畫才能重問,本來就不是好體驗。
    // 拒絕的話還是要講清楚——尤其 crisis 那一條帶著 1925 安心專線。
    speak(hit.lines, restart);
    return true;
  }

  // ── 開牌前先確認本喵真的聽懂了 ───────────────────────────
  // 客人常用只有自己懂的說法(公司名、圈內用語、代稱「他」)。硬著頭皮解
  // 就會解錯方向,或掰出根本不存在的東西。真正的占卜師會先問清楚再翻牌。
  // 全程不扣點數;API 掛掉就直接開牌,不能因為追問失敗擋住付費流程。
  var clarifyRounds = [];

  function askClarify(done) {
    thinkingPanel.style.display = "block";
    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;

    fetch(Tarot.CLARIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: topic || "other",
        scenario: scenario ? scenario.label : "",
        question: questionText(),
        rounds: clarifyRounds
      }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (timer) clearTimeout(timer);
        thinkingPanel.style.display = "none";
        if (d && d.ok && d.question) askBack(d.question, done);
        else done();
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        thinkingPanel.style.display = "none";
        done();   // 追問失敗就直接開牌
      });
  }

  function askBack(q, done) {
    hideStages();
    clarifyInput.value = "";
    clarifyHint.textContent = "說清楚一點,本喵才不會看錯方向";
    clarifyHint.classList.remove("is-error");
    clarifyInput.classList.remove("is-error");

    speak([q], function () {
      showStage(clarifyPanel);
      clarifyInput.focus();
    });

    clarifyBtn.onclick = function () {
      var a = clarifyInput.value.trim();
      if (a.length < 2) {
        clarifyHint.textContent = "再多說一點點,本喵聽不懂";
        clarifyHint.classList.add("is-error");
        clarifyInput.classList.add("is-error");
        clarifyInput.focus();
        return;
      }
      clarifyBtn.onclick = null;
      clarifyRounds.push({ q: q, a: a });
      clarifyPanel.style.display = "none";
      askClarify(done);   // 再確認一次,伺服器端最多問兩輪
    };
  }

  function beginRound() {
    if (!canStartRound()) return;
    unlockVideo();
    hideStages();
    var opening = ["要在心中默念你的心意喔,本喵要開始了。"];
    // 自由發問的人不知道本喵挑了哪個牌陣,先講一句再開始
    if (autoPickedLine) {
      opening.unshift(autoPickedLine);
      autoPickedLine = null;
    }
    speak(opening, function () {
      // 次數扣在這裡,而不是按下按鈕的當下:前面還有「這個問題不適合占卜」
      // 與追問兩道關卡會把人擋回去,扣早了客人會白白少一次。
      if (!IS_DESK) Tarot.useCredit();
      updateCredits();
      startSwipeShuffle();
    });
  }

  drawBtn.addEventListener("click", function () {
    if (!questionIsReady()) return;
    if (handleUnsuitable()) return;
    if (!resolveAutoSpread()) return;
    if (!optionsAreReady()) return;
    if (!canStartRound()) return;
    unlockVideo();          // 追問會插在中間,先趁這個手勢把影片解鎖
    hideStages();
    clarifyRounds = [];
    askClarify(beginRound);
  });

  // ── 第四步:手指洗牌 ────────────────────────────────────
  // 累積滑動距離達標才算洗透。種子由這段軌跡長度組成,所以「洗牌的是客人自己」。
  var SWIPE_TARGET = 480;   // 原本 800。現場一個接一個排隊,滑太久會卡住流程

  function trailCtx() {
    var r = swipeStage.getBoundingClientRect();
    swipeTrail.width = r.width;
    swipeTrail.height = r.height;
    return swipeTrail.getContext ? swipeTrail.getContext("2d") : null;
  }

  function startSwipeShuffle() {
    swipeDistance = 0;
    swipeFill.style.width = "0%";
    if (swipeMeter) swipeMeter.setAttribute("aria-valuenow", 0);
    swipeHint.textContent = "用手指在牌上來回滑動,滑得越久洗得越透";
    swipeHint.classList.remove("is-done");
    swipeStage.classList.remove("is-settled");
    swipeStage.classList.add("is-live");
    showStage(shufflePanel);

    var ctx = trailCtx();
    var last = null;
    var dragging = false;
    var done = false;

    function paint(x, y) {
      if (!ctx) return;
      if (last) {
        ctx.strokeStyle = "rgba(245, 205, 130, .55)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      last = { x: x, y: y };
    }

    function fade() {
      if (!ctx) return;
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,.08)";
      ctx.fillRect(0, 0, swipeTrail.width, swipeTrail.height);
      ctx.globalCompositeOperation = "source-over";
      if (!done) requestAnimationFrame(fade);
    }
    requestAnimationFrame(fade);

    function finish() {
      if (done) return;
      done = true;
      swipeStage.classList.remove("is-live");
      swipeStage.classList.add("is-settled");
      swipeStage.removeEventListener("pointerdown", onDown);
      swipeStage.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      Tarot.Sound.purr(1.1);
      // 讓牌落定的動畫走完再收掉洗牌區,不然畫面會跳一下
      setTimeout(function () { shufflePanel.style.display = "none"; }, 700);
      speak(["洗得差不多了,接下來換你【切牌】。"], startCut);
    }

    function onDown(e) {
      dragging = true;
      last = null;
      var r = swipeStage.getBoundingClientRect();
      paint(e.clientX - r.left, e.clientY - r.top);
    }

    function onMove(e) {
      if (!dragging || done) return;
      e.preventDefault();
      var r = swipeStage.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (last) {
        var dx = x - last.x, dy = y - last.y;
        swipeDistance += Math.sqrt(dx * dx + dy * dy);
      }
      paint(x, y);

      var progress = Math.min(swipeDistance / SWIPE_TARGET, 1);
      swipeFill.style.width = (progress * 100).toFixed(1) + "%";
      swipeStage.style.setProperty("--churn", progress.toFixed(3));
      if (swipeMeter) swipeMeter.setAttribute("aria-valuenow", Math.round(progress * 100));
      if (navigator.vibrate) navigator.vibrate(6);
      if (progress >= 1) finish();
    }

    function onUp() {
      dragging = false;
      last = null;
      if (done) return;
      if (swipeDistance < SWIPE_TARGET) {
        swipeHint.textContent = "還差一點,再滑久一點讓牌散開喵";
      }
    }

    // 洗牌同樣不能只有滑動一種操作。連按方向鍵/空白鍵一樣累積洗牌距離,
    // 種子照樣來自客人自己的動作,不是程式亂數決定的。
    function onKey(e) {
      if (done) return;
      var k = e.key;
      if (k !== "ArrowLeft" && k !== "ArrowRight" && k !== "ArrowUp" && k !== "ArrowDown" &&
          k !== " " && k !== "Spacebar" && k !== "Enter") return;
      e.preventDefault();
      swipeDistance += 55;
      var progress = Math.min(swipeDistance / SWIPE_TARGET, 1);
      swipeFill.style.width = (progress * 100).toFixed(1) + "%";
      swipeStage.style.setProperty("--churn", progress.toFixed(3));
      if (swipeMeter) swipeMeter.setAttribute("aria-valuenow", Math.round(progress * 100));
      if (progress >= 1) finish();
    }

    swipeStage.addEventListener("pointerdown", onDown);
    swipeStage.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // ── 第五步:切牌 ───────────────────────────────────────
  // 上下疊張數即時顯示,離手才鎖定——讓客人隨時可以改主意。
  // 切牌是垂直動作:牌堆側躺著,由上往下疊 78 張,
  // p = 從頂端算下來的切點。cutLeft 是上疊、cutRight 是下疊。
  function paintCut(p) {
    var pct = (p * 100).toFixed(2) + "%";
    cutLeft.style.height = pct;
    cutRight.style.height = (100 - p * 100).toFixed(2) + "%";
    cutSeam.style.top = pct;
    // 上疊被抬起來:離中點越遠抬得越開,再帶一點側移與傾斜,
    // 模擬手抓著一疊牌斜斜提起來的樣子
    var lift = 10 + Math.abs(p - 0.5) * 26;
    cutLeft.style.transform =
      "translateY(-" + lift.toFixed(1) + "px) translateX(" + (lift * 0.35).toFixed(1) + "px) rotate(-1.1deg)";
    cutRight.style.transform = "translateY(" + (lift * 0.18).toFixed(1) + "px)";
    var upper = Math.max(1, Math.min(77, Math.round(p * 78)));
    cutUpperCount.textContent = upper;
    cutLowerCount.textContent = 78 - upper;
    // 讀螢幕的人看不到牌堆,靠這兩個值知道自己切到哪
    cutStage.setAttribute("aria-valuenow", upper);
    cutStage.setAttribute("aria-valuetext", "上疊 " + upper + " 張,下疊 " + (78 - upper) + " 張");
  }

  function startCut() {
    cutPoint = 0.5;
    paintCut(cutPoint);
    cutHint.textContent = "上下滑動,決定從第幾張切開這副牌";
    cutStage.classList.remove("is-cut");
    showStage(cutPanel);

    var dragging = false;
    var touched = false;

    function at(e) {
      var r = cutStage.getBoundingClientRect();
      return Math.max(0.05, Math.min(0.95, (e.clientY - r.top) / r.height));
    }

    function onDown(e) {
      dragging = true;
      touched = true;
      cutStage.classList.add("is-cut");
      cutPoint = at(e);
      paintCut(cutPoint);
      if (navigator.vibrate) navigator.vibrate(5);
    }

    function onMove(e) {
      if (!dragging) return;
      e.preventDefault();
      cutPoint = at(e);
      paintCut(cutPoint);
      if (navigator.vibrate) navigator.vibrate(4);
    }

    // 切完牌就進入下一步,但要確保客人真的操作過(不是一載入就衝過去)
    function commitCut() {
      if (!touched) return;
      Tarot.Sound.blip(620);
      cutStage.removeEventListener("pointerdown", onDown);
      cutStage.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      hideStages();
      playShuffle(revealCards);
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      commitCut();
    }

    // 滑動是主要操作,但不能是唯一操作——鍵盤要有等價的切牌方式。
    // 上下鍵移動切點(Shift 加速),Enter 確認,對應 role="slider"。
    function onKey(e) {
      var step = e.shiftKey ? 0.08 : 0.015;
      var next = cutPoint;
      if (e.key === "ArrowUp") next = cutPoint - step;
      else if (e.key === "ArrowDown") next = cutPoint + step;
      else if (e.key === "Home") next = 0.05;
      else if (e.key === "End") next = 0.95;
      else if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (!touched) {           // 還沒動過就按 Enter,當作在正中間切
          touched = true;
          cutStage.classList.add("is-cut");
          paintCut(cutPoint);
        }
        commitCut();
        return;
      } else return;
      e.preventDefault();
      touched = true;
      cutStage.classList.add("is-cut");
      cutPoint = Math.max(0.05, Math.min(0.95, next));
      paintCut(cutPoint);
    }

    cutStage.addEventListener("pointerdown", onDown);
    cutStage.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // ── 第四步:滿版洗牌動畫,鎖住捲動、看完才淡出 ───────────────
  function playShuffle(next) {
    var done = false;
    var guard = null;

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(guard);
      drawVideo.removeEventListener("ended", finish);
      drawVideo.removeEventListener("error", finish);
      drawVideo.removeEventListener("playing", armGuard);
      drawVideo.removeEventListener("loadedmetadata", armGuard);
      // 這兩個是這一輪才掛上去的,一定要拆掉:playDraw 每抽一次牌就會
      // 再跑一遍,不拆的話監聽器會一輪一輪疊上去。
      drawOverlay.removeEventListener("click", finish);
      clearInterval(stallWatch);
      drawOverlay.classList.add("fading");
      setTimeout(function () {
        drawOverlay.style.display = "none";
        drawOverlay.classList.remove("fading");
        drawVideo.pause();
        document.body.classList.remove("no-scroll");
        next();
      }, 900);
    }

    // 正常情況靠 ended 收尾。保險計時依影片實際長度算(換影片不用改這裡),
    // 並從真正開始播放才起算,網路慢時才不會把影片攔腰切斷。
    function armGuard() {
      clearTimeout(guard);
      var dur = isFinite(drawVideo.duration) && drawVideo.duration > 0 ? drawVideo.duration : 9;
      guard = setTimeout(finish, (dur - drawVideo.currentTime + 1) * 1000);
    }

    drawVideo.addEventListener("ended", finish);
    drawVideo.addEventListener("error", finish);
    drawVideo.addEventListener("playing", armGuard);
    drawVideo.addEventListener("loadedmetadata", armGuard);

    // 跟進場那一層同一套卡住偵測:手機網路上影片 stall 住的時候,
    // ended 不會來、error 也不會來,只靠上面那個保險就得等它跑完。
    // 進度停住超過 1.6 秒就當它卡了,直接收掉往下走。
    var lastTime = -1, stallTicks = 0;
    var stallWatch = setInterval(function () {
      if (drawOverlay.style.display === "none") { clearInterval(stallWatch); return; }
      if (drawVideo.currentTime === lastTime) {
        if (++stallTicks >= 4) { clearInterval(stallWatch); finish(); }
      } else {
        stallTicks = 0;
        lastTime = drawVideo.currentTime;
      }
    }, 400);

    // 點一下跳過。現場真的卡住時的逃生門。
    drawOverlay.addEventListener("click", finish);

    document.body.classList.add("no-scroll");
    drawOverlay.style.display = "block";
    drawVideo.currentTime = 0;
    drawVideo.muted = !Tarot.Sound.isOn();
    var p = drawVideo.play();
    if (p && p.catch) p.catch(finish);
    // 完全播不起來(被瀏覽器擋下、檔案壞掉)時的最後防線
    guard = setTimeout(finish, 6000);
  }

  // ── 第五步:翻牌 ───────────────────────────────────
  function buildDeck(cards) {
    tarotDeck.innerHTML = "";
    cards.forEach(function (c, i) {
      var slot = document.createElement("div");
      slot.className = "tarot-slot";
      slot.innerHTML =
        '<div class="slot-position">' + c.position + "</div>" +
        '<div class="tarot-card pending' + (c.orientation === "reversed" ? " is-reversed" : "") +
             '" data-i="' + i + '" style="animation-delay:' + i * 0.09 + 's">' +
          '<div class="tarot-card-inner">' +
            '<div class="tarot-card-face tarot-card-back"></div>' +
            '<div class="tarot-card-face tarot-card-front">' +
              '<span class="card-art"></span>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="tarot-caption hidden">' +
          '<div class="name">' + c.name + "</div>" +
          '<div class="orientation">' + (c.orientation === "upright" ? "正位" : "逆位") + "</div>" +
        "</div>";
      // 用 DOM 設定,避免 url("…") 的引號把 style 屬性截斷
      slot.querySelector(".card-art").style.backgroundImage = Tarot.artUrl(c.n);
      // 有圖形的牌陣(關係十字/賽爾特十字/生命之樹)靠 grid-area 把牌釘在該在的位置
      if (c.area) slot.style.gridArea = c.area;
      tarotDeck.appendChild(slot);
    });
    return tarotDeck.querySelectorAll(".tarot-card");
  }

  function sparkle(el) {
    for (var i = 0; i < 7; i++) {
      var s = document.createElement("span");
      s.className = "cat-sparkle";
      var angle = (Math.PI * 2 * i) / 7 + Math.random() * 0.5;
      var dist = 26 + Math.random() * 20;
      s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      s.style.animationDelay = Math.random() * 0.12 + "s";
      el.appendChild(s);
      setTimeout(function (node) { return function () { node.remove(); }; }(s), 950);
    }
  }

  function revealCards() {
    lastSpread = (scenario && scenario.spread) || "flow";
    // 種子完全來自客人:洗牌軌跡長度 + 切點。同一組操作必定抽到同一副牌。
    var seed = Math.floor(swipeDistance * 1000 + cutPoint * 7919 + Date.now() % 100000);
    lastOptions = chosenOptions();
    var cards = Tarot.drawSpread(lastSpread, seed, cutPoint, lastOptions);
    lastCards = cards;
    refunded = false;
    usedFallback = false;
    var cardEls = buildDeck(cards);
    var layout = (Tarot.SPREADS[lastSpread] || {}).layout;
    tarotDeck.className = "tarot-deck count-" + cards.length + (layout ? " layout-" + layout : "");
    tarotDeck.style.display = "grid";
    if (tarotFlow) tarotFlow.classList.add("has-cards");
    cardSummary.innerHTML = "";
    resultPanel.classList.add("show");
    tarotDeck.scrollIntoView({ behavior: "smooth", block: "center" });

    // 牌越多翻越快,不然十一張牌要看客人枯等六秒
    var step = cards.length <= 3 ? 520 : cards.length <= 5 ? 400 : 230;

    // 有圖形的牌陣是用 grid-area 排的,DOM 順序不等於畫面順序,照 DOM 翻
    // 看起來就會亂跳。改成由上往下、由左往右翻。
    // (top 取整到 20px 一格,同一列的細微差異不影響排序)
    var flipOrder = cards.map(function (c, i) { return i; }).sort(function (a, b) {
      var ra = cardEls[a].getBoundingClientRect(), rb = cardEls[b].getBoundingClientRect();
      var rowA = Math.round(ra.top / 20), rowB = Math.round(rb.top / 20);
      return rowA !== rowB ? rowA - rowB : ra.left - rb.left;
    });

    // 摘要列表照牌陣的邏輯順序先建好放著,翻到哪張才顯示哪張,
    // 這樣列表的順序不會被翻牌順序打亂。
    var summaryItems = cards.map(function (c) {
      var li = document.createElement("li");
      li.className = "pending-item";
      li.innerHTML = '<i class="pos">' + c.position + "</i><b>" + c.name +
        (c.orientation === "upright" ? "" : "(逆位)") + "</b><span>" + c.meaning + "</span>";
      cardSummary.appendChild(li);
      return li;
    });

    flipOrder.forEach(function (idx, seq) {
      setTimeout(function () {
        var el = cardEls[idx];
        el.classList.remove("pending");
        el.classList.add("flipped", "just-flipped");
        // 牌名等翻開一半再出現,才不會提前爆雷
        setTimeout(function (slot) {
          return function () { slot.querySelector(".tarot-caption").classList.remove("hidden"); };
        }(el.parentNode), 330);
        sparkle(el);
        // 翻牌只用呼嚕聲,不用貓叫——貓叫太尖銳,連續翻牌會嚇到人。
        // 而且只在第一張與最後一張各一次,中間安靜。
        if (seq === 0 || seq === cards.length - 1) Tarot.Sound.purr(0.9);
        setTimeout(function () { el.classList.remove("just-flipped"); }, 700);
        summaryItems[idx].classList.remove("pending-item");
      }, 300 + seq * step);
    });

    setTimeout(function () {
      Tarot.Sound.purr(2.2);
      requestReading(cards);
    }, 300 + cards.length * step + 250);
  }

  // ── 第六步:本喵一句一句說解讀,說完列成總表 ────────────────
  function speakReading(text) {
    lastReading = text;
    var lines = splitSentences(text);
    speak(lines, function () {
      summaryList.innerHTML = "";
      lines.forEach(function (s) {
        var el = document.createElement("li");
        var segs = toSegs(s);
        el.innerHTML = renderSegs(segs, segsLength(segs));
        summaryList.appendChild(el);
      });
      catDialogue.style.display = "none";
      readingSummary.style.display = "block";
      againBtn.style.display = "inline-flex";
      reportBtn.style.display = "inline-flex";
      // 「傳給客人」是店主端的動作,客人自己的手機上不該出現
      if (IS_DESK) qrBtn.style.display = "inline-flex";
      showGemPick();
      Tarot.Sound.purr(1.6);
      // 解讀講完了,客人接下來只會做兩件事:存圖或再抽一次。
      // 所以直接把畫面帶到最下面那兩顆按鈕,不要讓人自己往下捲一大段。
      // 桌面版解讀有自己的捲動區,要捲的是那一區而不是整頁。
      var scroller = resultPanel.scrollHeight > resultPanel.clientHeight ? resultPanel : null;
      requestAnimationFrame(function () {
        if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
        else document.querySelector(".tarot-actions").scrollIntoView({ behavior: "smooth", block: "end" });
      });
    }, true);   // 解牌字多,一句一句自己點著讀
    catDialogue.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // AI 掛掉時不能讓客人空手而回:退回次數,並用本地牌義先給一段簡版解讀,
  // 同時把「這是簡版」講清楚,不假裝是完整的占卜。
  function failReading(msg) {
    loadingNote.style.display = "none";
    errorNote.textContent = msg;
    errorNote.style.display = "block";
    retryBtn.style.display = "inline-flex";
    if (!refunded) {
      refunded = true;
      Tarot.addCredits(1);
      updateCredits();
    }
    if (!usedFallback && lastCards) {
      usedFallback = true;
      resultPanel.classList.add("is-fallback");
      speakReading(Tarot.localReading(lastSpread || "flow", lastCards));
    } else {
      againBtn.style.display = "inline-flex";
    }
  }

  function requestReading(cards) {
    loadingNote.style.display = "block";
    errorNote.style.display = "none";
    retryBtn.style.display = "none";
    againBtn.style.display = "none";
    readingSummary.style.display = "none";
    catDialogue.style.display = "none";

    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 25000) : null;

    fetch(Tarot.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: topic || "other",
        spread: lastSpread || "flow",
        scenario: scenario ? scenario.label : "",
        question: questionText(),
        clarify: clarifyRounds,
        optionA: lastOptions ? lastOptions.a : "",
        optionB: lastOptions ? lastOptions.b : "",
        cards: cards.map(function (c) { return { name: c.name, orientation: c.orientation, keyword: c.keyword }; })
      }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (timer) clearTimeout(timer);
        loadingNote.style.display = "none";
        if (data && data.ok) speakReading(data.reading);
        else failReading((data && data.error) || "本喵現在有點累,請稍後再試");
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        failReading("連線逾時,請確認網路後再試一次");
      });
  }

  // ── 報告書:把這一輪畫成一張圖,手機可以直接分享到 LINE ──────
  reportBtn.addEventListener("click", function () {
    if (!lastCards || !lastReading) return;
    var label = reportBtn.textContent;
    reportBtn.disabled = true;
    reportBtn.textContent = "本喵畫圖中⋯";

    var spread = Tarot.SPREADS[lastSpread || "flow"];
    TarotReport.render({
      question: questionText(),
      spreadName: spread ? spread.name : "",
      cards: lastCards,
      readingSegs: toSegs(lastReading),
      artOf: function (n) { return "./assets/cards/" + (n < 10 ? "0" + n : n) + ".jpg"; }
    }).then(function (cv) {
      return TarotReport.shareOrSave(cv, function (state) {
        reportBtn.textContent =
          state === "shared" ? "已送出喵~" :
          state === "saved" ? "已存到相簿/下載" :
          state === "error" ? "產圖失敗,再試一次" : label;
      });
    }).catch(function () {
      reportBtn.textContent = "產圖失敗,再試一次";
    }).then(function () {
      reportBtn.disabled = false;
      setTimeout(function () { reportBtn.textContent = label; }, 2600);
    });
  });

  // ── 從這次的占卜推薦一顆石頭 ──────────────────────────────
  // 客人不必再選任何東西:他選的主題、抽到的牌、正逆位就夠了。
  // 剛讀完自己的狀態,這時候推最順,也最像「本喵替你想到的」。
  function showGemPick() {
    if (!gemPick || !window.Gem || !lastCards) return;
    lastGem = Gem.recommend(topic, lastCards);
    // 有實拍照就用照片,沒有就退回漸層球——店主可以一顆一顆補圖
    var orb = document.getElementById("gemOrb");
    var photo = document.getElementById("gemPhoto");
    // 有實拍照就用照片,沒有就用 SVG 畫的寶石(不是扁圓球,有刻面與高光)
    var src = Gem.imageFor(lastGem.stone) || Gem.svgFor(lastGem.stone);
    photo.onerror = function () { photo.src = Gem.svgFor(lastGem.stone); };
    photo.src = src;
    photo.alt = lastGem.stone.name;
    photo.style.display = "";
    photo.style.filter = "drop-shadow(0 6px 18px " + lastGem.stone.accent + "99)";
    orb.style.display = "none";
    document.getElementById("gemName").textContent = lastGem.stone.name;
    document.getElementById("gemFamily").textContent = lastGem.family.label;
    document.getElementById("gemWhy").textContent = lastGem.why;
    document.getElementById("gemLine").textContent = lastGem.stone.line;
    gemPick.style.display = "block";
  }

  // ── 傳給客人:螢幕出現 QR,客人用自己的手機掃走結果圖 ──────────
  // 這裡刻意「不換頁」:QR 只是蓋在上面的一層,店主的占卜畫面完整
  // 留在後面,關掉就能直接接下一位。
  //
  // QR 指的是圖片檔本身(/api/tarot/share/<token>,回 image/*),
  // 不是站上任何一頁——客人掃到的就是一張圖,沒有導覽也沒有連結,
  // 不會因此多一個回來繼續免費占卜的入口。
  var SHARE_URL = /\.vercel\.app$/.test(location.hostname)
    ? "/api/tarot/share"
    : "https://healingasmr.vercel.app/api/tarot/share";

  var qrShare = document.getElementById("qrShare");
  var qrShareImg = document.getElementById("qrShareImg");
  var qrShareLoading = document.getElementById("qrShareLoading");
  var qrShareExpiry = document.getElementById("qrShareExpiry");
  var qrShareError = document.getElementById("qrShareError");

  function openQrPanel() {
    qrShareImg.style.display = "none";
    qrShareImg.removeAttribute("src");
    qrShareLoading.style.display = "";
    qrShareLoading.textContent = "本喵畫圖中⋯";
    qrShareExpiry.textContent = "";
    qrShareError.style.display = "none";
    qrShare.style.display = "grid";
  }

  function closeQrPanel() {
    qrShare.style.display = "none";
  }

  function qrFailed(msg) {
    qrShareLoading.style.display = "none";
    qrShareError.textContent = msg;
    qrShareError.style.display = "";
  }

  qrBtn.addEventListener("click", function () {
    if (!lastCards || !lastReading) return;
    openQrPanel();

    var spread = Tarot.SPREADS[lastSpread || "flow"];
    TarotReport.render({
      question: questionText(),
      spreadName: spread ? spread.name : "",
      cards: lastCards,
      readingSegs: toSegs(lastReading),
      // 這張圖是要給現場客人帶走的。預設的 footer 會印上占卜頁網址,
      // 等於告訴客人怎麼繞過付費自己去玩,所以換成 LINE 導客。
      cta: { top: "想成為線上珠寶商?", bottom: "加 LINE 了解怎麼開始" },
      artOf: function (n) { return "./assets/cards/" + (n < 10 ? "0" + n : n) + ".jpg"; }
    }).then(function (cv) {
      // JPEG 比 PNG 小很多,這張圖是照片式的塔羅牌面,壓縮痕跡看不出來
      var dataUrl = cv.toDataURL("image/jpeg", 0.86);
      qrShareLoading.textContent = "上傳中⋯";
      return fetch(SHARE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl })
      });
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      if (!d || !d.qr) throw new Error("回應缺少 QR");
      qrShareImg.src = d.qr;
      qrShareImg.style.display = "";
      qrShareLoading.style.display = "none";
      var hrs = Math.max(1, Math.round((new Date(d.expiresAt) - Date.now()) / 3600000));
      qrShareExpiry.textContent = "這個連結 " + hrs + " 小時後自動刪除,請客人現在就截圖存起來";
    }).catch(function (e) {
      console.error("[qr] 產生失敗", e);
      qrFailed("QR 產生失敗了喵,先用「存成圖片」把結果存下來吧。");
    });
  });

  qrCloseBtn.addEventListener("click", closeQrPanel);

  qrNextBtn.addEventListener("click", function () {
    closeQrPanel();
    againBtn.click();          // 沿用既有的「再抽一次」重置流程
  });

  // Esc 關掉:店主現場操作,手不一定在滑鼠上
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && qrShare.style.display !== "none") closeQrPanel();
  });

  retryBtn.addEventListener("click", function () {
    if (lastCards) requestReading(lastCards);
  });

  againBtn.addEventListener("click", function () {
    clearTimeout(typeTimer);
    readingSummary.style.display = "none";
    againBtn.style.display = "none";
    reportBtn.style.display = "none";
    qrBtn.style.display = "none";
    if (gemPick) gemPick.style.display = "none";
    lastGem = null;
    retryBtn.style.display = "none";
    errorNote.style.display = "none";
    questionInput.value = "";
    optionA.value = "";
    optionB.value = "";
    topic = null;
    scenario = null;
    lastOptions = null;
    autoPickedLine = null;
    clarifyRounds = [];
    resultPanel.classList.remove("is-fallback");
    document.querySelectorAll(".topic-chip").forEach(function (c) { c.classList.remove("active"); });
    if (!canStartRound()) return;   // 次數用完就直接看到加購頁,不再走一次流程
    startIntro();
    catDialogue.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  pickVideo();
  dialogueAvatar.innerHTML = Tarot.catFace("happy", false);
  document.getElementById("thinkingCat").innerHTML = Tarot.catFace("calm", false);
  paintSound();

  // ── 進站動線:等待影片(循環) → 點一下 → 進場影片(播一次) → 開始占卜 ──
  // 這一下點擊是整頁唯一保證存在的使用者手勢,所以順手把後面那幾支
  // 要程式化播放的影片一起解鎖(iOS 不給無手勢播放)。
  var waitOverlay = document.getElementById("waitOverlay");
  var enterOverlay = document.getElementById("enterOverlay");
  var enterVideo = document.getElementById("enterVideo");
  var gateDone = false;

  // 不論進場影片是播完、播壞還是根本沒載到,都要把客人放進來,
  // 不能讓人卡在一片黑畫面上。
  // 依「會用到的先後」一支一支抓。抓完就把來源換成 blob,
  // 之後播放完全不碰網路。
  function startPrefetch() {
    var srcEl = enterVideo.querySelector("source");
    var enterName = srcEl ? (srcEl.getAttribute("src") || "").split("/").pop() : null;

    var chain = Promise.resolve();

    if (enterName) {
      chain = chain.then(function () { return prefetchVideo(enterName); });
    }

    // 洗牌影片:依現在的螢幕比例抓對應那一支
    chain.then(function () {
      var wide = window.matchMedia("(min-aspect-ratio: 1/1)").matches;
      return prefetchVideo(SHUFFLE[wide ? "wide" : "portrait"].mp4);
    });
  }

  var gateCleanup = null;

  function openGate() {
    if (gateDone) return;
    gateDone = true;
    if (gateCleanup) { gateCleanup(); gateCleanup = null; }
    // 影片還在播就先停,不然它會在關掉的圖層後面繼續跑、繼續出聲
    try { enterVideo.pause(); } catch (e) {}
    enterOverlay.style.display = "none";
    document.body.classList.remove("no-scroll");
    if (canStartRound()) startIntro();
  }

  if (waitOverlay && enterOverlay && enterVideo) {
    document.body.classList.add("no-scroll");

    function enterSite() {
      if (gateDone) return;
      unlockVideo();                       // 借這個手勢解鎖洗牌／唱歌影片
      startBgm();                          // 同一下手勢也是背景音樂的起點
      waitOverlay.style.display = "none";
      enterOverlay.style.display = "block";

      // ── 這一關絕對不能卡住 ────────────────────────────────────
      // 現場已經踩到兩次。原則改成:進場動畫是「附加的」,不是通往
      // 占卜流程的門。它有機會播,但無論如何都不准擋著客人。
      //
      // 五道,任何一道成立就放人進來:
      //   1. ended       —— 正常播完
      //   2. error       —— 檔案壞了或載不到
      //   3. 根本沒開始   —— play() 之後 1.2 秒還沒有任何播放進度
      //   4. 播到一半停住 —— 進度連續 1.2 秒沒有前進
      //   5. 點畫面      —— 客人自己跳過
      // 另外還有一個依影片長度算的總保險,是最後一道。
      //
      // 第 3 道是這次補的。先前只有「播到一半停住」那一道,而它是拿
      // currentTime 跟上一次比——影片如果根本沒載起來,currentTime
      // 可能是 NaN,而 NaN === NaN 永遠是 false,那一道就永遠不會成立。
      // 現在改用「有沒有前進」來判斷,NaN 進不來。
      var gateTimers = [];
      function later(fn, ms) { gateTimers.push(setTimeout(fn, ms)); return gateTimers[gateTimers.length - 1]; }
      function clearGateTimers() {
        gateTimers.forEach(clearTimeout);
        gateTimers.length = 0;
        clearInterval(stallWatch);
      }

      var progressed = false;               // 影片到底有沒有真的動過
      var lastTime = 0, stillTicks = 0;

      enterVideo.addEventListener("ended", openGate);
      enterVideo.addEventListener("error", openGate);
      enterVideo.addEventListener("timeupdate", function () { progressed = true; });

      var stallWatch = setInterval(function () {
        if (gateDone) { clearGateTimers(); return; }
        var t = enterVideo.currentTime;
        // 只認「數字而且比上次大」才算有前進。NaN、undefined 都不算。
        if (typeof t === "number" && isFinite(t) && t > lastTime + 0.01) {
          lastTime = t;
          stillTicks = 0;
          progressed = true;
        } else if (++stillTicks >= 3) {     // 連續三次 = 1.2 秒沒動
          openGate();
        }
      }, 400);

      // 總保險:影片長度 + 2 秒,最多不超過 10 秒。拿不到長度就用 4 秒。
      later(function () {
        var dur = isFinite(enterVideo.duration) && enterVideo.duration > 0 ? enterVideo.duration : 4;
        var left = Math.min((dur + 2) * 1000, 10000);
        later(openGate, left);
      }, 0);

      // 點畫面任何地方都能跳過
      enterOverlay.addEventListener("click", openGate);

      var p = enterVideo.play();
      if (p && p.catch) p.catch(openGate);

      // 第 3 道:play() 之後 1.2 秒還沒有任何進度,就當它起不來
      later(function () { if (!progressed) openGate(); }, 1200);

      // openGate 收尾時要把這些計時器都清掉
      gateCleanup = clearGateTimers;
    }

    // 背景預抓。等待畫面正在播、客人正在讀「點一下,本喵就開始」的那幾秒
    // 就是最好的時機——網路是閒的,而接下來兩支影片都還沒被用到。
    startPrefetch();

    waitOverlay.addEventListener("click", enterSite);
    // 等待畫面蓋住整頁,沒有鍵盤入口的話用鍵盤的人根本進不來
    waitOverlay.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        enterSite();
      }
    });
    waitOverlay.focus();
  } else {
    if (canStartRound()) startIntro();
  }
});