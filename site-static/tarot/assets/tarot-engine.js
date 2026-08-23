/* TAHIR ZAINAB TAROT — 占卜引擎(桌機版與手機版共用)
   ────────────────────────────────────────────────────────────
   這支檔案原本是 tarot-desktop.html 裡的 inline script。

   2026-08-21:手機版與電腦版合併成同一份 index.html,而且不再分模式。
   先前有 desk / phone 兩種模式,差在額度、QR、品牌連結——次數整組拿掉
   之後,那個分支只剩下「要不要出現 QR 跟岔路」,卻害店主開錯網址就看不到
   自己剛做好的功能。現在一律相同:

     選主題 → 選處境 → 在心裡默念 → 洗牌 → 切牌 → 翻牌
       → 問「我自己看 / 直接告訴我」→ 解讀或 QR → 推寶石

   版面差異(單欄/兩欄、直式/橫式影片)一律交給 CSS 與螢幕寬度處理,
   程式這一層不再有任何「哪一版」的判斷。
   ──────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", function () {
  var tarotFlow = document.getElementById("tarotFlow");
  var catDialogue = document.getElementById("catDialogue");
  var dialogueAvatar = document.getElementById("dialogueAvatar");
  var dialogueText = document.getElementById("dialogueText");
  var dialogueCaret = document.getElementById("dialogueCaret");
  var topicPanel = document.getElementById("topicPanel");
  var scenarioPanel = document.getElementById("scenarioPanel");
  var scenarioList = document.getElementById("scenarioList");
  // 寬螢幕 = 放在桌上、旁邊的人看得到 → 才需要問「要不要讓人看」。
  // 窄螢幕 = 拿在自己手上,本來就是私密的 → 問了沒有意義,而且選「我自己看」
  // 只會拿到一個自己掃不到的 QR。每次要用的時候現算,平板轉個方向也對。
  function isWideScreen() {
    return window.matchMedia("(min-width: 900px)").matches;
  }

  var privacyPanel = document.getElementById("privacyPanel");
  var privacySelfBtn = document.getElementById("privacySelfBtn");
  var privacyTellBtn = document.getElementById("privacyTellBtn");
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
  var clarifyHint = document.getElementById("clarifyHint");
  var clarifyYesBtn = document.getElementById("clarifyYesBtn");
  var clarifyNoBtn = document.getElementById("clarifyNoBtn");
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
  var loadingText = document.getElementById("loadingText");
  var loadingBar = document.getElementById("loadingBar");
  var loadingFill = document.getElementById("loadingFill");
  var errorNote = document.getElementById("errorNote");
  var readingSummary = document.getElementById("readingSummary");
  var summaryList = document.getElementById("summaryList");
  var retryBtn = document.getElementById("retryBtn");
  var againBtn = document.getElementById("againBtn");
  var resultLineBtn = document.getElementById("resultLineBtn");
  var reportBtn = document.getElementById("reportBtn");
  var qrBtn = document.getElementById("qrBtn");
  var gemPick = document.getElementById("gemPick");
  var lastGem = null;
  var qrCloseBtn = document.getElementById("qrCloseBtn");
  var qrNextBtn = document.getElementById("qrNextBtn");
  var soundToggle = document.getElementById("soundToggle");

  var topic = null;
  var scenario = null;
  var lastCards = null;
  var lastSpread = null;
  // 記下這一輪的兩個選項,「請本喵再看一次」重送時才不會漏掉
  var lastOptions = null;
  var lastReading = "";
  var usedFallback = false;
  // 客人自己滑出來的種子:洗牌軌跡長度 + 切牌位置,決定抽到哪幾張牌
  var swipeDistance = 0;
  var cutPoint = 0.5;
  // 自由發問時本喵挑好牌陣要說的那句話,抽牌前才講

  var TOPIC_REPLY = {
    love: "感情的事啊⋯⋯本喵最懂了。",
    career: "工作上的煩惱嗎?讓本喵看看。",
    money: "金錢的來去,牌面看得很清楚。"
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
  // 2026-08-21:占卜次數整組拿掉(店主決定網頁版一律無限、也不顯示)。
  // canStartRound() 留著是因為流程有三處在呼叫它,而且它還負責把
  // #tarotFlow 顯示出來;現在它永遠回 true。
  function canStartRound() {
    tarotFlow.style.display = "";
    return true;
  }

  // ── 音效開關 ───────────────────────────────────────
  // 背景音樂:不另外做暫停鈕,跟著既有的音效開關走。
  // 自動播放又完全關不掉對訪客很不友善,而這個開關本來就在畫面上,不必多一顆。
  var bgm = document.getElementById("bgm");

  // 背景音樂。手機一次手勢通常只准放一個媒體,而進場影片跟它會搶——
  // 影片優先(客人看得到),音樂被擋下就記著,之後任何一次手勢或進場
  // 動畫結束時再補播。所以「一開始就有音樂」在能放的第一時間就會成立。
  function startBgm() {
    if (!bgm || !Tarot.Sound.isOn()) return;
    if (!bgm.paused) return;                     // 已經在播就別重來
    bgm.volume = 0.28;                           // 墊底用,不能蓋過本喵講話的音效
    var p = bgm.play();
    if (p && p.catch) {
      p.catch(function () {
        // 被擋下了。掛一次性的補播:下一個手勢就接上。
        var retry = function () {
          document.removeEventListener("pointerdown", retry, true);
          document.removeEventListener("keydown", retry, true);
          startBgm();
        };
        document.addEventListener("pointerdown", retry, true);
        document.addEventListener("keydown", retry, true);
      });
    }
  }

  function paintSound() {
    var on = Tarot.Sound.isOn();
    soundToggle.classList.toggle("off", !on);
    soundToggle.setAttribute("aria-pressed", String(on));
    soundToggle.setAttribute("aria-label", on ? "關閉音樂" : "打開音樂");
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
    if (privacyPanel) privacyPanel.style.display = "none";
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
    (Tarot.SCENARIOS[t] || Tarot.SCENARIOS.love).forEach(function (s) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scenario-item";
      btn.dataset.id = s.id;
      // 2026-08-18:全部處境都走三張牌,牌陣標籤每一顆都一樣就是雜訊,拿掉。
      btn.innerHTML = '<span class="scenario-label">' + s.label + "</span>";
      btn.addEventListener("click", function () {
        scenarioList.querySelectorAll(".scenario-item").forEach(function (x) { x.classList.remove("active"); });
        btn.classList.add("active");
        // 每次重選處境都從乾淨狀態開始(auto 會在抽牌前改寫 spread)
        scenario = { id: s.id, label: s.label, spread: s.spread };
        questionPanel.style.display = "none";
        // 2026-08-22:輸入框拿回來。客人打完字之後本喵會先複述一次確認,
        // 聽懂了才開牌(見 askClarify / askBack)。
        optionPanel.style.display = "none";
        questionField.style.display = "block";
        speak([
          SPREAD_REPLY.flow,
          "那麼,把你想問的事寫下來給本喵看吧。"
        ], function () {
          showStage(questionPanel);
          questionInput.focus();
        });
      });
      scenarioList.appendChild(btn);
    });
  }

  // ── 第三步:至少五個字,不夠本喵會提醒 ─────────────────────
  function questionIsReady() {
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
    return questionInput.value.trim();
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
    // 2026-08-21:直式洗牌影片換成店主新給的那支(720x1280,10 秒)。
    // poster 留空——舊的那張是前一支影片的畫面,對不上新片第一格。
    portrait: { mp4: "tarot-shuffle-portrait.mp4", webm: "", poster: "" }
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
    if (v.poster) drawVideo.poster = "./assets/videos/" + v.poster;
    else drawVideo.removeAttribute("poster");
    // 一定要 load():<source> 的 src 是 JS 事後填的,而瀏覽器只在解析頁面
    // 的當下跑一次「挑來源」,事後改 <source> 不會讓它重挑。不叫 load()
    // 的話 networkState 會一直停在 NO_SOURCE,play() 直接被拒絕,
    // playShuffle() 的 p.catch(finish) 立刻把滿版影片收掉——畫面上看起來
    // 就是「影片閃半秒就沒了」。
    // (2026-08-18 實測:currentSrc 是空字串、networkState=3。進場與等待
    //  那兩支影片沒事,因為它們的網址直接寫在 HTML 的 <source> 上。)
    //
    // load() 不會造成重複下載:preload="none" 之下它只跑挑來源,不抓內容;
    // 真的要播時檔案已經在 HTTP 快取裡(startPrefetch 抓過)。
    drawVideo.load();
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
  // 客人改完問題再按一次「交給本喵」時,要接回原本那條路(askBack 存下來的)
  var pendingAfterQuestion = null;

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

  // 複述確認:本喵把「它以為客人在問什麼」講一次,客人只答對/不對。
  // 比開放式追問好在——客人不用再打一次字,而且看得到本喵到底聽懂沒有。
  //   對   → 直接開牌
  //   不是 → 退回問題欄(保留原文讓他改),改完再確認一次,直到對了才算
  function askBack(q, done) {
    hideStages();
    clarifyHint.textContent = "本喵要先聽懂,才不會算錯方向";

    speak([q], function () {
      showStage(clarifyPanel);
      clarifyYesBtn.focus();
    });

    clarifyYesBtn.onclick = function () {
      clarifyYesBtn.onclick = null;
      clarifyNoBtn.onclick = null;
      clarifyRounds.push({ q: q, a: "是" });
      clarifyPanel.style.display = "none";
      done();                       // 聽懂了,開牌
    };

    clarifyNoBtn.onclick = function () {
      clarifyYesBtn.onclick = null;
      clarifyNoBtn.onclick = null;
      clarifyRounds.push({ q: q, a: "不是" });
      clarifyPanel.style.display = "none";
      // 退回去改。原文留著,客人多半只是要補一句,不必整段重打。
      speak(["那本喵理解錯了,你再說一次好嗎?"], function () {
        showStage(questionPanel);
        questionInput.focus();
        questionInput.setSelectionRange(questionInput.value.length, questionInput.value.length);
      });
      // 下一次按「交給本喵」會再跑一輪 askClarify,帶著這次的紀錄
      pendingAfterQuestion = done;
    };
  }

  function beginRound() {
    if (!canStartRound()) return;
    unlockVideo();
    hideStages();
    var opening = ["要在心中默念你的心意喔,本喵要開始了。"];
    speak(opening, function () {
      startSwipeShuffle();
    });
  }

  drawBtn.addEventListener("click", function () {
    if (!questionIsReady()) return;
    if (handleUnsuitable()) return;
    if (!canStartRound()) return;
    unlockVideo();          // 複述確認會插在中間,先趁這個手勢把影片解鎖
    hideStages();
    var next = pendingAfterQuestion || beginRound;
    pendingAfterQuestion = null;
    // clarifyRounds 不清空:第二輪要讓本喵知道上次猜錯了什麼,才不會再猜一樣的
    askClarify(next);
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
    // 保險:萬一來源還是沒選上(pickVideo 因為 overlay 開著而提早 return 過),
    // 這裡補一次,不要讓客人再看到閃一下就消失的影片。
    if (!drawVideo.currentSrc) drawVideo.load();
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

  // ── 解讀到手之後的岔路(只有店面版)────────────────────────
  // 店面那台螢幕旁邊常常站著別人。有些客人不想被看到內容,那就一個字
  // 都不要放上螢幕,直接出 QR 讓他自己用手機看;想聽的人照舊。
  // 這一步一定要卡在「顯示內文之前」——晚一步就已經被看光了。
  function deliverReading(text) {
    lastReading = text;
    if (!privacyPanel || !isWideScreen()) { speakReading(text); return; }
    hideStages();
    speak(["本喵看完了。要本喵直接告訴你,還是你自己看就好?"], function () {
      showStage(privacyPanel);
    });
  }

  if (privacySelfBtn) {
    privacySelfBtn.addEventListener("click", function () {
      // 螢幕上什麼都不出:不講解讀、不列總表、不推石頭,直接 QR。
      hideStages();
      // 客人如果把 QR 關掉,底下不能是一片空白——留一顆「再抽一次」當出口。
      againBtn.style.display = "inline-flex";
      shareQr();
    });
  }
  if (privacyTellBtn) {
    privacyTellBtn.addEventListener("click", function () {
      hideStages();
      speakReading(lastReading);
    });
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
      // 帶走的方式看螢幕:
      //   寬螢幕(店裡那台)→ QR,客人用自己的手機掃走
      //   窄螢幕(自己的手機)→ 存成圖片,直接進相簿。給 QR 是要他掃自己,沒道理。
      if (isWideScreen()) qrBtn.style.display = "inline-flex";
      else reportBtn.style.display = "inline-flex";
      if (resultLineBtn) resultLineBtn.style.display = "block";
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
    // 不給「再看一次」:直接換下一輪比較快,而且降級文案照樣看得到。
    if (!usedFallback && lastCards) {
      usedFallback = true;
      resultPanel.classList.add("is-fallback");
      deliverReading(Tarot.localReading(lastSpread || "flow", lastCards));
    } else {
      againBtn.style.display = "inline-flex";
    }
  }

  // ── 等待儀式 ──────────────────────────────────────
  // 解讀要跑十幾二十秒。這段時間畫面如果完全靜止,客人會以為當機。
  // 兩層處理:
  //   1. 進度條——依經過時間漸進,永遠往前、不會倒退。用指數收斂
  //      (24 秒約到 92%),所以不管實際多久都不會提早衝到 100% 再乾等。
  //   2. 旁白——照著這一輪真正抽到的牌名走,客人知道本喵在看哪一張,
  //      而不是看一句跟自己無關的罐頭。
  function waitingLines(cards) {
    var names = (cards || []).slice(0, 3).map(function (c) { return c.name; });
    var lines = ["本喵把牌一張一張排開⋯"];
    if (names[0]) lines.push("先看「" + names[0] + "」在說什麼⋯");
    if (names[1]) lines.push("再對照「" + names[1] + "」那一張⋯");
    if (names[2]) lines.push("「" + names[2] + "」擺在這裡有意思⋯");
    lines.push("幾張牌湊起來,線索出來了⋯");
    lines.push("本喵想想怎麼跟你說⋯");
    lines.push("最後一段,快好了⋯");
    return lines;
  }

  function startWaiting(cards) {
    var lines = waitingLines(cards);
    var t0 = Date.now();
    var i = 0;
    if (loadingText) loadingText.textContent = lines[0];
    if (loadingFill) loadingFill.style.width = "0%";

    var tick = setInterval(function () {
      var ms = Date.now() - t0;
      // 92 * (1 - e^(-t/9s)):9 秒約 58%、18 秒約 79%、27 秒約 87%
      var pct = 92 * (1 - Math.exp(-ms / 9000));
      if (loadingFill) loadingFill.style.width = pct.toFixed(1) + "%";
      if (loadingBar) loadingBar.setAttribute("aria-valuenow", Math.round(pct));
      var want = Math.min(lines.length - 1, Math.floor(ms / 3200));
      if (want !== i) { i = want; if (loadingText) loadingText.textContent = lines[i]; }
    }, 220);

    return function stop() {
      clearInterval(tick);
      if (loadingFill) loadingFill.style.width = "100%";
      if (loadingBar) loadingBar.setAttribute("aria-valuenow", 100);
    };
  }

  function requestReading(cards) {
    loadingNote.style.display = "block";
    errorNote.style.display = "none";
    retryBtn.style.display = "none";
    againBtn.style.display = "none";
    readingSummary.style.display = "none";
    catDialogue.style.display = "none";

    var stopWaiting = startWaiting(cards);
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
        stopWaiting();
        loadingNote.style.display = "none";
        if (data && data.ok) deliverReading(data.reading);
        else failReading((data && data.error) || "本喵現在有點累,請稍後再試");
      })
      .catch(function () {
        if (timer) clearTimeout(timer);
        stopWaiting();          // 失敗也要收,不然計時器會一直跑下去
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
  var qrOpenBtn = document.getElementById("qrOpenBtn");
  var qrShareError = document.getElementById("qrShareError");

  function openQrPanel() {
    if (qrOpenBtn) { qrOpenBtn.style.display = "none"; qrOpenBtn.removeAttribute("href"); }
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

  // 產生分享圖 → 上傳 → 顯示 QR。兩個入口共用:結果頁的「傳給客人・QR」,
  // 以及客人選「我自己看」時的直接跳轉。
  function shareQr() {
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
      // 同一個結果頁的網址:掃不到自己螢幕的人直接點這顆
      if (qrOpenBtn && d.url) { qrOpenBtn.href = d.url; qrOpenBtn.style.display = "block"; }
      var hrs = Math.max(1, Math.round((new Date(d.expiresAt) - Date.now()) / 3600000));
      qrShareExpiry.textContent = "這個連結 " + hrs + " 小時後自動刪除,請客人現在就截圖存起來";
    }).catch(function (e) {
      console.error("[qr] 產生失敗", e);
      qrFailed("QR 產生失敗了喵,先用「存成圖片」把結果存下來吧。");
    });
  }

  qrBtn.addEventListener("click", shareQr);

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
    // 每一輪都當成新的一位客人,從最前面的等待影片與進場動畫重新開始。
    // 進場那道門由 gateDone 鎖住只會跑一次,與其在這裡拆一堆狀態,
    // 整頁重載最乾淨,也保證上一輪的任何殘留都不會留下來。
    // (影片與牌圖都在瀏覽器快取裡,重載很快。)
    //
    // 2026-08-21:原本 return 底下還留著一整段手動重設(清欄位、收按鈕、
    // 回到 startIntro),那是「再抽一次不重載」時代的東西,現在永遠執行不到。
    // 留著會誤導以後讀這段的人以為那些狀態有被清,所以刪掉。
    location.reload();
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
      unlockVideo();                       // 借這個手勢解鎖洗牌影片
      waitOverlay.style.display = "none";
      enterOverlay.style.display = "block";
      // 背景音樂不在這裡開。手機一次手勢通常只准放一個媒體,先放音樂的話
      // 進場影片的 play() 會被拒絕,而被拒絕的那支就會被 p.catch 直接收掉——
      // 店主看到的「開場動畫一秒半就被切掉」就是這樣來的。
      // 音樂改在影片真的開始播之後才起(見下面的 playing 事件)。

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
        } else if (++stillTicks >= 6) {     // 連續六次 = 2.4 秒沒動
          // 原本是 1.2 秒。網路慢的時候影片會邊播邊緩衝,停一秒是常態,
          // 那樣的門檻會把好好的影片砍掉。真的卡死等 2.4 秒也不算久。
          openGate();
        }
      }, 400);

      // 主要收尾:播到「剩最後 1 秒」就放人進來(店主要求:讓它播完,
      // 只剪掉最後一秒——那一秒通常是收尾定格,等它沒有意義)。
      //
      // 一定要等 loadedmetadata 才讀 duration。2026-08-21 這裡出過事:
      // 原本在 later(..., 0) 裡立刻讀 enterVideo.duration,但那時候
      // preload="none" 的影片還沒載 metadata,duration 是 NaN,程式退回
      // 預設值 4 秒,於是 4+2=6 秒就強制收掉——店主那支 10 秒的進場影片
      // 固定在第 6 秒被砍。看起來像「影片被剪短了」,其實是這道保險誤觸。
      var cutTimer = null, insureTimer = null;
      function armEnterGuards() {
        var dur = enterVideo.duration;
        if (!isFinite(dur) || dur <= 0) return;
        clearTimeout(cutTimer);
        clearTimeout(insureTimer);
        var now = isFinite(enterVideo.currentTime) ? enterVideo.currentTime : 0;
        cutTimer = later(openGate, Math.max(0, (dur - 1 - now)) * 1000);
        // 總保險:影片本身有多長就等多長再加 3 秒(緩衝的餘裕)
        insureTimer = later(openGate, Math.max(1000, (dur + 3 - now) * 1000));
      }
      enterVideo.addEventListener("loadedmetadata", armEnterGuards);
      enterVideo.addEventListener("playing", armEnterGuards);
      // metadata 一直沒來(檔案壞了、網路斷了)時的最後一道,給得寬鬆一點
      later(openGate, 15000);

      // 點畫面任何地方都能跳過。但要「晚一點」才掛:進場那一層是在客人
      // 剛剛那一下點擊裡才顯示出來的,手機的 ghost click(touchend 之後
      // 約 300ms 補送的那一下)會直接打在它身上,動畫還沒開始就被跳過。
      // 等 800 毫秒再開放跳過,客人真的想跳的時候一定還按得到。
      later(function () { enterOverlay.addEventListener("click", openGate); }, 800);

      // 影片真的開始播了,才去起背景音樂——這樣兩者不會搶同一下手勢。
      enterVideo.addEventListener("playing", function () { startBgm(); });

      // play() 被拒絕不可以直接關掉整個動畫。手機常見的拒絕原因是
      // 「這一下手勢已經被別的媒體用掉了」或「不允許有聲自動播放」,
      // 那就靜音再播一次——動畫看得到,遠比有沒有聲音重要。
      // 兩次都失敗才放人進去。
      var p = enterVideo.play();
      if (p && p.catch) {
        p.catch(function () {
          enterVideo.muted = true;
          var p2 = enterVideo.play();
          if (p2 && p2.catch) p2.catch(openGate);
          else startBgm();          // 靜音播成功:音樂改由 bgm 那邊出
        });
      }

      // 第 3 道:play() 之後還沒有任何進度,就當它起不來。
      // 原本 1.2 秒,對 preload="none" 的影片太緊(要先抓才播得動),放寬到 3 秒。
      later(function () { if (!progressed) openGate(); }, 3000);

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