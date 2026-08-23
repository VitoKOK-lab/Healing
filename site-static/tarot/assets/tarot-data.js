// 喵喵占卜:78 張完整塔羅牌義資料庫(00-21 大牌,22-77 權杖/聖杯/寶劍/錢幣) + 抽牌/額度小工具 + 貓咪造型與音效。
// 純前端展示用短牌義,完整解讀由後端 Gemini API 依這三張牌即時生成。
// 貓咪插畫為手繪 SVG(向量、無外部檔案),叫聲以 Web Audio 即時合成(無音檔)。
(function (global) {
  var CARDS = [
    { n:  0, name: "愚者", keyword: "全新的起點", upright: "放下顧慮,勇敢跨出第一步", reversed: "衝動躁進,建議先想清楚再行動" },
    { n:  1, name: "魔術師", keyword: "整合資源", upright: "手邊的條件已經足夠,是時候動手了", reversed: "光說不練,能量分散難以聚焦" },
    { n:  2, name: "女祭司", keyword: "傾聽直覺", upright: "答案其實你早已知道,靜下心就會看見", reversed: "資訊不透明,先別急著下結論" },
    { n:  3, name: "皇后", keyword: "滋養豐盛", upright: "溫柔對待自己,豐盛正在靠近", reversed: "過度付出讓自己疲憊,該留一點給自己" },
    { n:  4, name: "皇帝", keyword: "穩定掌控", upright: "建立秩序與規劃,會讓局面更踏實", reversed: "太執著掌控,反而錯過彈性空間" },
    { n:  5, name: "教皇", keyword: "傳統智慧", upright: "前輩或既有經驗值得參考", reversed: "別被舊有框架綁住,允許自己走不一樣的路" },
    { n:  6, name: "戀人", keyword: "選擇與連結", upright: "順從內心真實的喜歡去做選擇", reversed: "猶豫不決,先釐清自己真正在意的是什麼" },
    { n:  7, name: "戰車", keyword: "堅定前進", upright: "方向已經對了,持續前進就好", reversed: "力氣用錯地方,先調整節奏再出發" },
    { n:  8, name: "力量", keyword: "溫柔而堅定", upright: "用耐心與善意化解眼前的難題", reversed: "別對自己太嚴苛,溫柔也是一種力量" },
    { n:  9, name: "隱者", keyword: "向內探尋", upright: "先給自己一段安靜的時間沉澱思考", reversed: "太封閉自己,適時向外求助也沒關係" },
    { n: 10, name: "命運之輪", keyword: "順勢而為", upright: "時機正在轉動,新的機會即將出現", reversed: "計畫可能有變化,保持彈性應對" },
    { n: 11, name: "正義", keyword: "衡量與公正", upright: "誠實面對現況,做出對得起自己的決定", reversed: "留意雙方認知落差,溝通會化解誤會" },
    { n: 12, name: "吊人", keyword: "換個角度", upright: "暫停下來,換個視角會看見不同答案", reversed: "拖延只會累積壓力,是時候做個決定了" },
    { n: 13, name: "死神", keyword: "結束與重生", upright: "放下不再適合的,才有空間迎接新局", reversed: "抗拒改變讓自己更辛苦,順其自然吧" },
    { n: 14, name: "節制", keyword: "調和平衡", upright: "找到中庸的節奏,事情會漸漸順暢", reversed: "步調失衡,提醒自己別走極端" },
    { n: 15, name: "惡魔", keyword: "看見執念", upright: "誠實面對讓自己不自由的習慣或關係", reversed: "已經有能力掙脫束縛,相信自己做得到" },
    { n: 16, name: "高塔", keyword: "打破重建", upright: "意外的變動其實是重新開始的契機", reversed: "與其抵抗變化,不如順勢調整腳步" },
    { n: 17, name: "星星", keyword: "希望與療癒", upright: "低潮終將過去,美好的事正在靠近", reversed: "先照顧好自己,別急著給自己打分數" },
    { n: 18, name: "月亮", keyword: "面對不安", upright: "情緒起伏是正常的,給自己多一點耐心", reversed: "困惑漸漸明朗,答案比想像中清楚" },
    { n: 19, name: "太陽", keyword: "自信綻放", upright: "帶著自信前進,好事會自然發生", reversed: "別和他人比較,你的步調已經很好" },
    { n: 20, name: "審判", keyword: "覺醒與整合", upright: "過去的經驗都是養分,勇敢迎接新的自己", reversed: "還在猶豫要不要跨出改變,給自己一點時間" },
    { n: 21, name: "世界", keyword: "圓滿完成", upright: "一個階段即將圓滿,準備好迎接下一步", reversed: "還差臨門一腳,別在最後放棄" },
    { n: 22, name: "權杖一", keyword: "熱情的火苗", upright: "一股想做點什麼的衝動升起了,跟著它走", reversed: "想法還沒成形,先別急著昭告天下" },
    { n: 23, name: "權杖二", keyword: "規劃遠方", upright: "站在起點看向遠方,是時候擬定計畫", reversed: "選擇太多反而猶豫,先縮小範圍" },
    { n: 24, name: "權杖三", keyword: "等待收成", upright: "已經播下的種子開始有回音,耐心等待", reversed: "期待落空別灰心,調整方向再來" },
    { n: 25, name: "權杖四", keyword: "安穩的慶祝", upright: "階段性的成果值得好好慶祝一下", reversed: "歸屬感暫時不明,先安頓好自己的心" },
    { n: 26, name: "權杖五", keyword: "良性的競爭", upright: "有摩擦是正常的,那代表大家都在乎", reversed: "無謂的爭執耗損能量,退一步比較好" },
    { n: 27, name: "權杖六", keyword: "被看見", upright: "努力被看見了,大方接受這份肯定", reversed: "別太在意他人眼光,你的價值不靠掌聲" },
    { n: 28, name: "權杖七", keyword: "守住立場", upright: "站穩你的位置,你比想像中更有底氣", reversed: "撐得有點累了,不是每一場都要贏" },
    { n: 29, name: "權杖八", keyword: "加速推進", upright: "事情開始快轉,把握這股順流", reversed: "步調太趕容易出錯,慢一點沒關係" },
    { n: 30, name: "權杖九", keyword: "最後一哩", upright: "撐過這一段,你已經比自己以為的更強", reversed: "防備太深會累,適時放鬆也是必要的" },
    { n: 31, name: "權杖十", keyword: "扛太多了", upright: "責任雖重,但你確實扛得起來", reversed: "該放下的就放下,不必什麼都自己來" },
    { n: 32, name: "權杖侍者", keyword: "好奇的初學者", upright: "保持好奇,新的學習正要開始", reversed: "三分鐘熱度,先專注做完一件事" },
    { n: 33, name: "權杖騎士", keyword: "勇往直前", upright: "帶著衝勁行動,現在正是時候", reversed: "衝過頭了,先確認方向再加速" },
    { n: 34, name: "權杖王后", keyword: "溫暖的號召力", upright: "你的熱情會自然吸引到對的人", reversed: "別把能量都給了別人,留一些給自己" },
    { n: 35, name: "權杖國王", keyword: "點燃他人", upright: "以身作則,你的行動會帶動整個局面", reversed: "強勢反而讓人退開,溫和一點更有力" },
    { n: 36, name: "聖杯一", keyword: "情感湧現", upright: "心被觸動了,允許自己好好感受", reversed: "情緒滿溢,先讓自己靜一靜" },
    { n: 37, name: "聖杯二", keyword: "彼此吸引", upright: "一段真誠的連結正在形成", reversed: "關係有點失衡,坦白說出來會更好" },
    { n: 38, name: "聖杯三", keyword: "有人陪著", upright: "身邊的人是你的力量,別忘了他們", reversed: "熱鬧過後的空虛,是提醒你回到自己" },
    { n: 39, name: "聖杯四", keyword: "提不起勁", upright: "停下來也好,無聊有時是轉機", reversed: "眼前其實有新的機會,抬頭看看" },
    { n: 40, name: "聖杯五", keyword: "為失去難過", upright: "難過是應該的,允許自己好好哀傷", reversed: "回頭看,你擁有的其實還有很多" },
    { n: 41, name: "聖杯六", keyword: "溫柔的回望", upright: "過去的美好仍在滋養現在的你", reversed: "別困在回憶裡,前面也有風景" },
    { n: 42, name: "聖杯七", keyword: "選擇太多", upright: "看起來都很好,但你心裡有偏好", reversed: "分清楚哪些是幻想、哪些是真的" },
    { n: 43, name: "聖杯八", keyword: "轉身離開", upright: "知道不對就離開,那是勇氣不是放棄", reversed: "猶豫著要不要走,先問自己在等什麼" },
    { n: 44, name: "聖杯九", keyword: "心願達成", upright: "想要的正在實現,好好享受這一刻", reversed: "得到了卻不滿足,重新問問自己要什麼" },
    { n: 45, name: "聖杯十", keyword: "圓滿的溫暖", upright: "被愛包圍的踏實,值得珍惜", reversed: "看起來完美卻不快樂,誠實面對它" },
    { n: 46, name: "聖杯侍者", keyword: "純真的心意", upright: "一個溫柔的訊息或邀請正在路上", reversed: "太過理想化,回到現實看看" },
    { n: 47, name: "聖杯騎士", keyword: "跟隨感覺", upright: "跟著心走,浪漫一點沒關係", reversed: "被情緒帶著跑,先冷靜下來" },
    { n: 48, name: "聖杯王后", keyword: "深深的同理", upright: "你的溫柔會被接住,也記得接住自己", reversed: "太在意他人情緒,先照顧自己的" },
    { n: 49, name: "聖杯國王", keyword: "穩住情緒", upright: "在起伏中保持平穩,你做得到", reversed: "情緒被壓抑了,找個出口說出來" },
    { n: 50, name: "寶劍一", keyword: "看清真相", upright: "混沌散去,你終於看見核心了", reversed: "想太多反而看不清,先放下再看" },
    { n: 51, name: "寶劍二", keyword: "不願決定", upright: "暫時的僵持是為了看得更清楚", reversed: "閉著眼不代表問題會消失,睜眼吧" },
    { n: 52, name: "寶劍三", keyword: "心痛難免", upright: "痛過才會知道自己真正在意什麼", reversed: "傷口正在癒合,別再反覆掀開它" },
    { n: 53, name: "寶劍四", keyword: "先休息", upright: "真的累了就休息,那不是浪費時間", reversed: "是時候重新啟動,慢慢來就好" },
    { n: 54, name: "寶劍五", keyword: "代價是什麼", upright: "贏了也要問值不值得", reversed: "放下輸贏,和解比較輕鬆" },
    { n: 55, name: "寶劍六", keyword: "離開風暴", upright: "往平靜的地方走,那是對的方向", reversed: "還沒準備好離開,再給自己一點時間" },
    { n: 56, name: "寶劍七", keyword: "獨自盤算", upright: "有些事自己處理就好,不必張揚", reversed: "偷偷來反而更累,坦白說出來吧" },
    { n: 57, name: "寶劍八", keyword: "被困住的感覺", upright: "綁住你的其實是想法,不是處境", reversed: "解開了,你比自己以為的更自由" },
    { n: 58, name: "寶劍九", keyword: "夜裡的焦慮", upright: "擔心的事多半不會發生,天亮就好", reversed: "最難的已經過去,慢慢會好起來" },
    { n: 59, name: "寶劍十", keyword: "跌到谷底", upright: "已經是最低點了,接下來只會往上", reversed: "撐過來了,新的一天正在開始" },
    { n: 60, name: "寶劍侍者", keyword: "敏銳的觀察", upright: "多問多看,你會發現關鍵細節", reversed: "話說太快容易傷人,先想一下" },
    { n: 61, name: "寶劍騎士", keyword: "直接切入", upright: "有話直說,拖著只會更複雜", reversed: "太衝動了,緩一緩再開口" },
    { n: 62, name: "寶劍王后", keyword: "理性清明", upright: "冷靜判斷,你的分析是準的", reversed: "話裡帶刺會推開人,溫柔一點" },
    { n: 63, name: "寶劍國王", keyword: "公正決斷", upright: "做出清楚的決定,不再模糊", reversed: "太過嚴厲,對人對己都留點餘地" },
    { n: 64, name: "錢幣一", keyword: "實際的機會", upright: "一個具體的好機會正在靠近", reversed: "機會還沒成熟,先把基礎打穩" },
    { n: 65, name: "錢幣二", keyword: "兩頭兼顧", upright: "忙得過來,但記得留意平衡", reversed: "蠟燭兩頭燒,得取捨了" },
    { n: 66, name: "錢幣三", keyword: "一起完成", upright: "和對的人合作,事情會做得更好", reversed: "分工不清楚,先把話講明白" },
    { n: 67, name: "錢幣四", keyword: "抓得很緊", upright: "守住現有的,穩紮穩打沒有錯", reversed: "抓太緊會失去彈性,鬆一點手" },
    { n: 68, name: "錢幣五", keyword: "覺得匱乏", upright: "難關是暫時的,身邊有人可以求助", reversed: "低潮正在過去,溫暖會回來" },
    { n: 69, name: "錢幣六", keyword: "給予與接受", upright: "付出與收穫會平衡,大方一點", reversed: "留意付出是否對等,別委屈自己" },
    { n: 70, name: "錢幣七", keyword: "耐心等待", upright: "已經做的都沒白費,再等一下", reversed: "不見成效就檢討方法,別硬撐" },
    { n: 71, name: "錢幣八", keyword: "紮實累積", upright: "一步一腳印,這條路是對的", reversed: "重複而無感,問問自己為了什麼" },
    { n: 72, name: "錢幣九", keyword: "自給自足", upright: "靠自己站穩了,值得為自己驕傲", reversed: "太獨立反而孤單,讓人靠近沒關係" },
    { n: 73, name: "錢幣十", keyword: "長遠的安穩", upright: "穩定的基礎正在成形,可以放心", reversed: "為長遠打算,現在的辛苦有意義" },
    { n: 74, name: "錢幣侍者", keyword: "踏實學習", upright: "從基本功開始,慢慢來比較快", reversed: "分心太多,先專注一件事做完" },
    { n: 75, name: "錢幣騎士", keyword: "穩穩前行", upright: "不快但很穩,這樣就很好", reversed: "太過保守會錯過,適時往前一步" },
    { n: 76, name: "錢幣王后", keyword: "務實的溫柔", upright: "把生活照顧好,就是最大的安全感", reversed: "照顧別人之餘,別忘了自己" },
    { n: 77, name: "錢幣國王", keyword: "豐足穩固", upright: "累積的成果會回饋你,享受它", reversed: "太在意得失,錢財之外還有很多" }
  ];


  // 大牌各有表情,小牌依牌組:權杖=好奇 聖杯=開心 寶劍=睿智 錢幣=平靜
  var MAJOR_MOODS = ["curious","happy","calm","happy","wise","wise","happy","curious","happy","calm",
                     "curious","wise","calm","calm","calm","curious","curious","happy","calm","happy","wise","happy"];
  function moodFor(n) {
    if (n < 22) return MAJOR_MOODS[n];
    if (n < 36) return "curious";
    if (n < 50) return "happy";
    if (n < 64) return "wise";
    return "calm";
  }

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
      purr: purr,
      blip: blip,
      isOn: function () { return enabled; },
      toggle: function () {
        enabled = !enabled;
        localStorage.setItem("tarotSound", enabled ? "on" : "off");
        if (enabled) purr(0.8);
        return enabled;
      }
    };
  })();

  // ── 牌陣 ─────────────────────────────────────────────
  // 客人不需要知道「牌陣」這個詞,他只選自己的處境,由 SCENARIOS 決定用哪個陣。
  var SPREADS = {
    single: {
      id: "single",
      name: "核心指引",
      positions: [
        { label: "核心指引", hint: "此刻最需要知道的一件事" }
      ]
    },
    flow: {
      id: "flow",
      name: "時間之流",
      positions: [
        { label: "過去", hint: "事情的根源,已經造成的影響" },
        { label: "現在", hint: "當前的狀況與正在發展的能量" },
        { label: "未來", hint: "接下來一到三個月的走向" }
      ]
    },
    choice: {
      id: "choice",
      name: "二擇一",
      positions: [
        { label: "現況", hint: "你此刻整體的處境" },
        { label: "選 A 的過程", hint: "走 A 這條路會遇到什麼" },
        { label: "選 B 的過程", hint: "走 B 這條路會遇到什麼" },
        { label: "選 A 的結果", hint: "A 最後會走到哪裡" },
        { label: "選 B 的結果", hint: "B 最後會走到哪裡" }
      ]
    },
    // 以下三個牌陣的牌不是排成一列,而是有固定的圖形。
    // area 對應 CSS 的 grid-template-areas,位置本身就是意義的一部分。
    relation: {
      id: "relation",
      name: "關係十字",
      layout: "cross",
      positions: [
        { label: "你的心", hint: "你在這段關係裡的心態與期待", area: "me" },
        { label: "對方的心", hint: "對方目前的想法或狀態", area: "you" },
        { label: "橫在中間的", hint: "關係裡的障礙或挑戰", area: "block" },
        { label: "關係的根", hint: "你們之間真正的基礎", area: "base" },
        { label: "往下走的樣子", hint: "這段關係的發展展望", area: "hope" }
      ]
    },
    celtic: {
      id: "celtic",
      name: "賽爾特十字",
      layout: "celtic",
      positions: [
        { label: "現況", hint: "事情此刻的核心", area: "p1" },
        { label: "橫跨的挑戰", hint: "正面擋著你的那股力量", area: "p2" },
        { label: "根源", hint: "潛意識裡的基礎,你沒說出口的部分", area: "p3" },
        { label: "剛過去的", hint: "正在退場、但影響還在的事", area: "p4" },
        { label: "心裡想的", hint: "你意識到的目標或期待", area: "p5" },
        { label: "快來的", hint: "短期內就要發生的變化", area: "p6" },
        { label: "你自己", hint: "你在這件事裡的姿態", area: "p7" },
        { label: "周圍的人事", hint: "環境與他人帶來的影響", area: "p8" },
        { label: "希望與恐懼", hint: "你既期待又害怕的那件事", area: "p9" },
        { label: "最後落點", hint: "這條路走下去的終點", area: "p10" }
      ]
    },
    tree: {
      id: "tree",
      name: "生命之樹",
      layout: "tree",
      positions: [
        { label: "王冠", hint: "這件事對你最高的意義與目的", area: "t1" },
        { label: "智慧", hint: "推動你的那股原始衝動", area: "t2" },
        { label: "理解", hint: "你對它的認識與既有框架", area: "t3" },
        { label: "慈悲", hint: "你願意付出、想擴張的部分", area: "t4" },
        { label: "嚴厲", hint: "你需要節制或切斷的部分", area: "t5" },
        { label: "美", hint: "整件事的核心平衡點", area: "t6" },
        { label: "勝利", hint: "你的熱情與人際能量", area: "t7" },
        { label: "榮耀", hint: "你的理性與溝通方式", area: "t8" },
        { label: "基礎", hint: "潛意識與日常習慣", area: "t9" },
        { label: "王國", hint: "落實到現實生活裡的樣子", area: "t10" },
        { label: "總結", hint: "整棵樹合起來要告訴你的事", area: "t11" }
      ]
    }
  };

  // 主題 → 具體處境。2026-08-18 起一律走 flow(過去/現在/未來三張):
  // 客人不必挑牌陣,問什麼都用同一個陣,流程一致、解讀也好比較。
  // SPREADS 裡其他幾個陣先留著(牌陣定義本身沒問題),只是目前沒有處境指向它們。
  var SCENARIOS = {
    love: [
      { id: "love-single", label: "想看看有沒有新的緣分", spread: "flow" },
      { id: "love-now", label: "這段關係接下來會怎麼走", spread: "flow" },
      { id: "love-two", label: "想知道對方怎麼想", spread: "flow" },
      { id: "love-trouble", label: "我們之間出了問題", spread: "flow" },
      { id: "love-stay", label: "要不要繼續走下去", spread: "flow" }
    ],
    career: [
      { id: "career-switch", label: "現在這份工作該不該換", spread: "flow" },
      { id: "career-new", label: "新的計畫值不值得投入", spread: "flow" },
      { id: "career-stuck", label: "職場上卡住了", spread: "flow" },
      { id: "career-rise", label: "想升遷或突破", spread: "flow" }
    ],
    money: [
      { id: "money-trend", label: "最近的財務走向", spread: "flow" },
      { id: "money-invest", label: "這筆錢要不要投下去", spread: "flow" },
      { id: "money-today", label: "今天的金錢指引", spread: "flow" }
    ]
  };

  // ── 不適合用塔羅問的題目 ──────────────────────────────
  // 在扣點數之前就攔下來:這些問題塔羅給不出負責任的答案,
  // 收了錢再給一段模稜兩可的話,對客人沒有好處。
  // crisis 這一類不唱歌——有人講到想不開時,唱歌是失禮的。
  var UNSUITABLE = [
    {
      kind: "crisis",
      re: /自殺|輕生|不想活|活不下去|結束生命|傷害自己|自殘/,
      lines: [
        "等一下。",
        "本喵不會用牌來回答這種事,牌也不該回答這種事。",
        "如果你現在很難受,台灣有【1925 安心專線】,二十四小時都有人接,不用錢。",
        "或者打給你信任的任何一個人都好,不一定要是專業的。",
        "本喵會在這裡等你。真的。"
      ]
    },
    {
      kind: "health",
      re: /生病|疾病|癌|腫瘤|開刀|手術|化療|確診|吃藥|藥物|療程|病情|檢查報告|會不會好起來|身體出了問題|憂鬱症|失眠症/,
      lines: [
        "唔⋯⋯這題本喵不能算。",
        "身體的事牌看不準,也不該由牌來說。【請去看醫生】,那才是能真正幫上你的人。",
        "本喵能陪你的是「要不要去看」「怕什麼」這種心裡的部分。"
      ]
    },
    {
      kind: "money",
      re: /股票|個股|台積電|加密|比特幣|虛擬貨幣|基金|樂透|彩券|賭|下注|買哪一?支|會漲|會跌|期貨|選擇權|報明牌|穩賺/,
      lines: [
        "喵?這題本喵不能算。",
        "牌不會報明牌,會漲會跌牌也不知道。這種事要問【真正懂的專業人士】。",
        "本喵能看的是你面對錢的心態——你在急什麼、在怕什麼。"
      ]
    },
    {
      kind: "death",
      re: /會不會死|死掉嗎|什麼時候死|過世|壽命|還能活多久|走得早|命長不長/,
      lines: [
        "這題本喵不算。",
        "生死不是牌能決定的,誰也算不準,【算了也不會讓你比較好過】。",
        "如果是在擔心某個人,本喵可以陪你看看你現在能為他做什麼。"
      ]
    },
    {
      kind: "world",
      re: /選舉|總統|立委|政黨|哪一黨|統獨|台海|戰爭|開戰|國際情勢|經濟崩盤|房價會|會不會通膨/,
      lines: [
        "這題本喵不能算喔。",
        "牌是拿來照自己的,【不是拿來算天下大事】的。那些事牽涉太多人,不歸牌管。",
        "但你對這些事的擔心是真的,那個本喵可以陪你看。"
      ]
    },
    {
      kind: "when",
      re: /(什麼時候|何時|幾月|幾號|哪一天|幾年後|多久之後|多久會)[^。?？]{0,10}(會|才|能|可以)|確切時間|精準時間/,
      lines: [
        "唔,這個問法本喵算不準。",
        "牌看的是能量的方向,不是日曆。【有行動,時間才會準】——你不動,問哪一天都沒有意義。",
        "換個問法吧:「我可以先做什麼讓它快一點?」這個本喵很會答。"
      ]
    },
    {
      // 牌面看的是眼前這股能量會怎麼走,大約三個月。問更遠的,牌上根本沒有那個東西。
      kind: "toofar",
      re: /明年|後年|大後年|[一二三四五六七八九十兩\d]\s*年後|未來[幾數][年十]|十年|五年|這輩子|下半輩子|一生|終老|退休以後|老了以後|[一二三四五六七八九十半\d]\s*年(內|後|之後)/,
      lines: [
        "唔⋯⋯這個時間太遠了,本喵看不到。",
        "牌看的是眼前這股能量會怎麼走,大概就【三個月】。再遠的,牌上根本沒有那個東西。",
        "而且三個月後你會做的選擇,現在還沒發生,誰也算不準。",
        "把問題縮到【最近這三個月】吧,那個本喵看得很清楚。"
      ]
    },
    {
      kind: "privacy",
      re: /外遇|劈腿|偷吃|出軌|小三|抓姦|他的密碼|偷看他|跟蹤|他薪水多少|他是不是在騙|他有沒有說謊/,
      lines: [
        "喵⋯⋯這題本喵不會算。",
        "那是【另一個人的隱私】,不是你的牌能翻的,翻了對你們兩個都不好。",
        "本喵可以陪你看的是:你為什麼這麼不安,還有你接下來想怎麼做。"
      ]
    }
  ];

  function unsuitable(text) {
    var q = String(text || "");
    for (var i = 0; i < UNSUITABLE.length; i++) {
      if (UNSUITABLE[i].re.test(q)) return UNSUITABLE[i];
    }
    return null;
  }

  function scenarioById(id) {
    for (var t in SCENARIOS) {
      if (!Object.prototype.hasOwnProperty.call(SCENARIOS, t)) continue;
      for (var i = 0; i < SCENARIOS[t].length; i++) {
        if (SCENARIOS[t][i].id === id) return SCENARIOS[t][i];
      }
    }
    return null;
  }

  // ── 可回溯的亂數 ───────────────────────────────────────
  // 洗牌與正逆位都由這顆種子決定,而種子來自客人自己的切牌位置與滑動軌跡。
  // 同一組種子必定抽出同一副牌——這就是「這副牌是我切的」能成立的原因。
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleWith(arr, rnd) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // 二擇一的位置名稱要換成客人自己講的兩個選項,不然牌面只會寫「選 A」,
  // 客人根本不知道 A 指的是什麼。太長會撐破版面,顯示時截短。
  function labelWithOptions(label, options) {
    if (!options || !options.a || !options.b) return label;
    var a = options.a.length > 6 ? options.a.slice(0, 6) + "…" : options.a;
    var b = options.b.length > 6 ? options.b.slice(0, 6) + "…" : options.b;
    // 連同「選 A」後面那個空格一起吃掉,不然會變成「選「⋯」 的過程」
    return label.replace("選 A ", "選「" + a + "」").replace("選 B ", "選「" + b + "」");
  }

  // cutPoint(0~1)決定從牌堆哪裡開始發牌,對應實體占卜的「切牌後從切口取牌」。
  function drawSpread(spreadId, seed, cutPoint, options) {
    var spread = SPREADS[spreadId] || SPREADS.flow;
    var rnd = makeRng(seed);
    var deck = shuffleWith(CARDS, rnd);
    var start = Math.floor(Math.max(0, Math.min(1, cutPoint || 0)) * deck.length);

    return spread.positions.map(function (pos, i) {
      var c = deck[(start + i) % deck.length];
      var upright = rnd() > 0.35;
      return {
        n: c.n,
        name: c.name,
        keyword: c.keyword,
        mood: moodFor(c.n),
        position: labelWithOptions(pos.label, options),
        positionHint: pos.hint,
        area: pos.area || "",
        orientation: upright ? "upright" : "reversed",
        meaning: upright ? c.upright : c.reversed
      };
    });
  }

  // ── 降級方案 ───────────────────────────────────────────
  // AI 連不上或額度用盡時,用本地牌義組一段基本解讀,至少讓客人拿到東西。
  // 刻意寫得比 AI 版簡短,呼叫端會標明這是簡版。
  function localReading(spreadId, cards) {
    var spread = SPREADS[spreadId] || SPREADS.flow;
    var reversed = cards.filter(function (c) { return c.orientation === "reversed"; }).length;
    var tone = reversed === 0
      ? "整體能量是【順的】,想做的事可以往前推"
      : reversed >= cards.length - reversed
        ? "牌面偏向【先向內看】,急著推進反而卡手"
        : "大方向還算順,只是有一處【需要調整】";

    var body = cards.map(function (c) {
      return c.position + "落在「" + c.name + "」" +
        (c.orientation === "upright" ? "" : "逆位") + ",說的是【" + c.keyword + "】——" + c.meaning;
    }).join(";");

    return "本喵先用" + spread.name + "替你看過一遍。" + tone + "。" +
      body + "。這一輪本喵的靈感有點淡,先給你這些,晚點再來讓本喵好好說一次。";
  }


  // 2026-08-21:占卜次數整組拿掉。原本是存在瀏覽器 localStorage 的
  // 計數器,換個瀏覽器或清一下資料就重來,擋不住任何人——它是提醒,
  // 不是收費。真正的額度在 LINE 版,存在資料庫裡。店主決定網頁版
  // 一律無限、也不顯示次數。

  // 牌面圖:檔名就是牌的編號。WebP 為主,不支援的瀏覽器退回 JPEG。
  var supportsWebp = (function () {
    var c = document.createElement("canvas");
    return !!(c.getContext && c.toDataURL("image/webp").indexOf("data:image/webp") === 0);
  })();

  function artUrl(n) {
    var base = "./assets/cards/" + (n < 10 ? "0" + n : n);
    return 'url("' + base + (supportsWebp ? ".webp" : ".jpg") + '")';
  }

  global.Tarot = {
    CARDS: CARDS,
    SPREADS: SPREADS,
    SCENARIOS: SCENARIOS,
    scenarioById: scenarioById,
    unsuitable: unsuitable,
    drawSpread: drawSpread,
    localReading: localReading,
    artUrl: artUrl,
    catFace: catFace,
    Sound: Sound,
    // 站台同時部署在 Vercel(與 API 同網域)與 GitHub Pages(需跨網域呼叫)
    API_URL: /\.vercel\.app$/.test(location.hostname)
      ? "/api/tarot/reading"
      : "https://healingasmr.vercel.app/api/tarot/reading",
    CLARIFY_URL: /\.vercel\.app$/.test(location.hostname)
      ? "/api/tarot/clarify"
      : "https://healingasmr.vercel.app/api/tarot/clarify",
    // 使用狀況回報。只送「走到哪一步 + 選了哪個分類」,不送客人打的字、
    // 不送任何識別碼(伺服器端的白名單也只收得下那幾個欄位)。
    EVENT_URL: /\.vercel\.app$/.test(location.hostname)
      ? "/api/tarot/event"
      : "https://healingasmr.vercel.app/api/tarot/event"
  };
})(window);
