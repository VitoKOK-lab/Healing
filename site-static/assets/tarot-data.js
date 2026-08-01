// 喵喵占卜:22 張大阿爾克那牌義資料庫 + 抽牌/額度小工具 + 貓咪造型與音效。
// 純前端展示用短牌義,完整解讀由後端 Gemini API 依這三張牌即時生成。
// 貓咪插畫為手繪 SVG(向量、無外部檔案),叫聲以 Web Audio 即時合成(無音檔)。
(function (global) {
  var CARDS = [
    { name: "愚者", mood: "curious", keyword: "全新的起點", upright: "放下顧慮,勇敢跨出第一步", reversed: "衝動躁進,建議先想清楚再行動" },
    { name: "魔術師", mood: "happy", keyword: "整合資源", upright: "手邊的條件已經足夠,是時候動手了", reversed: "光說不練,能量分散難以聚焦" },
    { name: "女祭司", mood: "calm", keyword: "傾聽直覺", upright: "答案其實你早已知道,靜下心就會看見", reversed: "資訊不透明,先別急著下結論" },
    { name: "皇后", mood: "happy", keyword: "滋養豐盛", upright: "溫柔對待自己,豐盛正在靠近", reversed: "過度付出讓自己疲憊,該留一點給自己" },
    { name: "皇帝", mood: "wise", keyword: "穩定掌控", upright: "建立秩序與規劃,會讓局面更踏實", reversed: "太執著掌控,反而錯過彈性空間" },
    { name: "教皇", mood: "wise", keyword: "傳統智慧", upright: "前輩或既有經驗值得參考", reversed: "別被舊有框架綁住,允許自己走不一樣的路" },
    { name: "戀人", mood: "happy", keyword: "選擇與連結", upright: "順從內心真實的喜歡去做選擇", reversed: "猶豫不決,先釐清自己真正在意的是什麼" },
    { name: "戰車", mood: "curious", keyword: "堅定前進", upright: "方向已經對了,持續前進就好", reversed: "力氣用錯地方,先調整節奏再出發" },
    { name: "力量", mood: "happy", keyword: "溫柔而堅定", upright: "用耐心與善意化解眼前的難題", reversed: "別對自己太嚴苛,溫柔也是一種力量" },
    { name: "隱者", mood: "calm", keyword: "向內探尋", upright: "先給自己一段安靜的時間沉澱思考", reversed: "太封閉自己,適時向外求助也沒關係" },
    { name: "命運之輪", mood: "curious", keyword: "順勢而為", upright: "時機正在轉動,新的機會即將出現", reversed: "計畫可能有變化,保持彈性應對" },
    { name: "正義", mood: "wise", keyword: "衡量與公正", upright: "誠實面對現況,做出對得起自己的決定", reversed: "留意雙方認知落差,溝通會化解誤會" },
    { name: "吊人", mood: "calm", keyword: "換個角度", upright: "暫停下來,換個視角會看見不同答案", reversed: "拖延只會累積壓力,是時候做個決定了" },
    { name: "死神", mood: "calm", keyword: "結束與重生", upright: "放下不再適合的,才有空間迎接新局", reversed: "抗拒改變讓自己更辛苦,順其自然吧" },
    { name: "節制", mood: "calm", keyword: "調和平衡", upright: "找到中庸的節奏,事情會漸漸順暢", reversed: "步調失衡,提醒自己別走極端" },
    { name: "惡魔", mood: "curious", keyword: "看見執念", upright: "誠實面對讓自己不自由的習慣或關係", reversed: "已經有能力掙脫束縛,相信自己做得到" },
    { name: "高塔", mood: "curious", keyword: "打破重建", upright: "意外的變動其實是重新開始的契機", reversed: "與其抵抗變化,不如順勢調整腳步" },
    { name: "星星", mood: "happy", keyword: "希望與療癒", upright: "低潮終將過去,美好的事正在靠近", reversed: "先照顧好自己,別急著給自己打分數" },
    { name: "月亮", mood: "calm", keyword: "面對不安", upright: "情緒起伏是正常的,給自己多一點耐心", reversed: "困惑漸漸明朗,答案比想像中清楚" },
    { name: "太陽", mood: "happy", keyword: "自信綻放", upright: "帶著自信前進,好事會自然發生", reversed: "別和他人比較,你的步調已經很好" },
    { name: "審判", mood: "wise", keyword: "覺醒與整合", upright: "過去的經驗都是養分,勇敢迎接新的自己", reversed: "還在猶豫要不要跨出改變,給自己一點時間" },
    { name: "世界", mood: "happy", keyword: "圓滿完成", upright: "一個階段即將圓滿,準備好迎接下一步", reversed: "還差臨門一腳,別在最後放棄" }
  ];

  // ── 手繪貓咪 SVG ────────────────────────────────────
  // 耳朵先畫(在頭後面),再畫頭、五官。顏色靠 CSS 的 currentColor 控制。

  var HEAD =
    '<g class="cat-ears">' +
    '<path class="cat-ear" d="M31 52 L33.5 26 L50.5 41 Z"/>' +
    '<path class="cat-ear" d="M69 52 L66.5 26 L49.5 41 Z"/>' +
    '<path class="cat-ear-in" d="M35.5 47 L37 33 L45.5 42 Z"/>' +
    '<path class="cat-ear-in" d="M64.5 47 L63 33 L54.5 42 Z"/>' +
    '</g>' +
    '<ellipse class="cat-head" cx="50" cy="66" rx="25" ry="22"/>';

  var FEATURES =
    '<path class="cat-whisker" d="M31 69 L12 65M31 73 L12 75M69 69 L88 65M69 73 L88 75"/>' +
    '<path class="cat-nose" d="M46.6 70 L53.4 70 L50 74.2 Z"/>' +
    '<path class="cat-mouth" d="M50 74.2 v2.6M50 76.8 q-3.6 3.4 -6.6 .2M50 76.8 q3.6 3.4 6.6 .2"/>';

  function openEye(cx, rx, ry) {
    return '<ellipse class="cat-eye" cx="' + cx + '" cy="63" rx="' + rx + '" ry="' + ry + '"/>' +
      '<ellipse class="cat-pupil" cx="' + cx + '" cy="63" rx="' + (rx * 0.44).toFixed(2) + '" ry="' + (ry * 0.74).toFixed(2) + '"/>' +
      '<circle class="cat-glint" cx="' + (cx + rx * 0.34).toFixed(2) + '" cy="' + (63 - ry * 0.36).toFixed(2) + '" r="1.15"/>';
  }

  function eyesFor(mood) {
    if (mood === "sleepy") return '<path class="cat-lash" d="M37 62.5 q5.2 4.8 10.4 0M52.6 62.5 q5.2 4.8 10.4 0"/>';
    if (mood === "happy") return '<path class="cat-lash" d="M37 65.5 q5.2 -5.6 10.4 0M52.6 65.5 q5.2 -5.6 10.4 0"/>';
    if (mood === "calm") return openEye(42, 4.6, 3.4) + openEye(58, 4.6, 3.4);
    if (mood === "wise") return openEye(42, 4.2, 4.6) + openEye(58, 4.2, 4.6);
    return openEye(42, 5.4, 6.4) + openEye(58, 5.4, 6.4); // curious
  }

  var STARS =
    '<g class="cat-stars">' +
    '<path d="M18 30 l1.5 3.9 3.9 1.5-3.9 1.5L18 40.8l-1.5-3.9-3.9-1.5 3.9-1.5z"/>' +
    '<path d="M82 34 l1.2 3.1 3.1 1.2-3.1 1.2L82 42.8l-1.2-3.1-3.1-1.2 3.1-1.2z"/>' +
    '<path d="M74 20 l1 2.6 2.6 1-2.6 1L74 27.2l-1-2.6-2.6-1 2.6-1z"/>' +
    '</g>';

  // mood: sleepy | happy | calm | wise | curious;  withStars 只有牌背用
  function catFace(mood, withStars) {
    return '<svg class="cat-art cat-' + mood + '" viewBox="0 0 100 100" aria-hidden="true">' +
      (withStars ? STARS : "") + HEAD + eyesFor(mood) + FEATURES + "</svg>";
  }

  // ── 貓叫聲(Web Audio 即時合成,無音檔)──────────────
  var Sound = (function () {
    var ctx = null;
    var enabled = localStorage.getItem("tarotSound") !== "off";

    function ac() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    // 「喵」:鋸齒波做聲源,音高先揚後降,兩組帶通濾波模擬貓的共振峰。
    function meow(delay, base) {
      if (!enabled) return;
      var c = ac();
      if (!c) return;
      var t = c.currentTime + (delay || 0);
      base = base || 620;

      var osc = c.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(base * 0.7, t);
      osc.frequency.linearRampToValueAtTime(base * 1.18, t + 0.1);
      osc.frequency.linearRampToValueAtTime(base * 0.6, t + 0.44);

      var vib = c.createOscillator();
      var vibGain = c.createGain();
      vib.frequency.value = 15;
      vibGain.gain.value = base * 0.035;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);

      var f1 = c.createBiquadFilter();
      f1.type = "bandpass"; f1.frequency.value = 860; f1.Q.value = 5.5;
      var f2 = c.createBiquadFilter();
      f2.type = "bandpass"; f2.frequency.value = 1950; f2.Q.value = 7;
      var lp = c.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 3600;

      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.07);
      g.gain.setValueAtTime(0.15, t + 0.24);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);

      osc.connect(f1); f1.connect(lp);
      osc.connect(f2); f2.connect(lp);
      lp.connect(g); g.connect(c.destination);

      osc.start(t); vib.start(t);
      osc.stop(t + 0.56); vib.stop(t + 0.56);
    }

    // 「呼嚕」:褐噪音過低通,再用低頻震盪做出規律的顫動。
    function purr(duration) {
      if (!enabled) return;
      var c = ac();
      if (!c) return;
      var t = c.currentTime;
      var dur = duration || 1.8;

      var buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
      var data = buf.getChannelData(0);
      var last = 0;
      for (var i = 0; i < data.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.2;
      }
      var src = c.createBufferSource();
      src.buffer = buf;

      var lp = c.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 230;

      var trem = c.createOscillator();
      trem.frequency.value = 25;
      var tremDepth = c.createGain();
      tremDepth.gain.value = 0.55;
      var tremGain = c.createGain();
      tremGain.gain.value = 0.45;
      trem.connect(tremDepth);
      tremDepth.connect(tremGain.gain);

      var out = c.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.1, t + 0.35);
      out.gain.setValueAtTime(0.1, t + dur - 0.5);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      src.connect(lp); lp.connect(tremGain); tremGain.connect(out);
      out.connect(c.destination);

      src.start(t); trem.start(t);
      src.stop(t + dur); trem.stop(t + dur);
    }

    // 「答答答」:打字時每隔幾個字的短促木質音,音量刻意壓低以免連續播放刺耳。
    function blip(pitch) {
      if (!enabled) return;
      var c = ac();
      if (!c) return;
      var t = c.currentTime;
      var base = pitch || 980;

      var osc = c.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 0.78, t + 0.03);

      var lp = c.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 2600;

      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

      osc.connect(lp); lp.connect(g); g.connect(c.destination);
      osc.start(t); osc.stop(t + 0.06);
    }

    return {
      meow: meow,
      purr: purr,
      blip: blip,
      isOn: function () { return enabled; },
      toggle: function () {
        enabled = !enabled;
        localStorage.setItem("tarotSound", enabled ? "on" : "off");
        if (enabled) meow(0, 700);
        return enabled;
      }
    };
  })();

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function drawThree() {
    return shuffle(CARDS).slice(0, 3).map(function (c) {
      var upright = Math.random() > 0.35;
      return {
        name: c.name,
        keyword: c.keyword,
        mood: c.mood,
        orientation: upright ? "upright" : "reversed",
        meaning: upright ? c.upright : c.reversed
      };
    });
  }

  var CREDIT_KEY = "tarotCredits";

  function getCredits() {
    var v = parseInt(localStorage.getItem(CREDIT_KEY), 10);
    if (isNaN(v)) {
      // 預設已付款 3 次,方便直接試玩;正式使用者則靠結帳頁加值。
      v = 3;
      localStorage.setItem(CREDIT_KEY, String(v));
    }
    return v;
  }

  function useCredit() {
    var v = Math.max(0, getCredits() - 1);
    localStorage.setItem(CREDIT_KEY, String(v));
    return v;
  }

  function addCredits(n) {
    var v = getCredits() + n;
    localStorage.setItem(CREDIT_KEY, String(v));
    return v;
  }

  global.Tarot = {
    CARDS: CARDS,
    drawThree: drawThree,
    catFace: catFace,
    Sound: Sound,
    getCredits: getCredits,
    useCredit: useCredit,
    addCredits: addCredits,
    // 站台同時部署在 Vercel(與 API 同網域)與 GitHub Pages(需跨網域呼叫)
    API_URL: /\.vercel\.app$/.test(location.hostname)
      ? "/api/tarot/reading"
      : "https://healingasmr.vercel.app/api/tarot/reading"
  };
})(window);
