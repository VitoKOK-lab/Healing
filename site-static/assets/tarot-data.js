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
        n: c.n,
        name: c.name,
        keyword: c.keyword,
        mood: moodFor(c.n),
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
