// AI 塔羅占卜:22 張大阿爾克那牌義資料庫 + 抽牌/額度小工具。
// 純前端展示用短牌義,完整解讀由後端 Gemini API 依這三張牌即時生成。
(function (global) {
  var CARDS = [
    { name: "愚者", keyword: "全新的起點", upright: "放下顧慮,勇敢跨出第一步", reversed: "衝動躁進,建議先想清楚再行動" },
    { name: "魔術師", keyword: "整合資源", upright: "手邊的條件已經足夠,是時候動手了", reversed: "光說不練,能量分散難以聚焦" },
    { name: "女祭司", keyword: "傾聽直覺", upright: "答案其實你早已知道,靜下心就會看見", reversed: "資訊不透明,先別急著下結論" },
    { name: "皇后", keyword: "滋養豐盛", upright: "溫柔對待自己,豐盛正在靠近", reversed: "過度付出讓自己疲憊,該留一點給自己" },
    { name: "皇帝", keyword: "穩定掌控", upright: "建立秩序與規劃,會讓局面更踏實", reversed: "太執著掌控,反而錯過彈性空間" },
    { name: "教皇", keyword: "傳統智慧", upright: "前輩或既有經驗值得參考", reversed: "別被舊有框架綁住,允許自己走不一樣的路" },
    { name: "戀人", keyword: "選擇與連結", upright: "順從內心真實的喜歡去做選擇", reversed: "猶豫不決,先釐清自己真正在意的是什麼" },
    { name: "戰車", keyword: "堅定前進", upright: "方向已經對了,持續前進就好", reversed: "力氣用錯地方,先調整節奏再出發" },
    { name: "力量", keyword: "溫柔而堅定", upright: "用耐心與善意化解眼前的難題", reversed: "別對自己太嚴苛,溫柔也是一種力量" },
    { name: "隱者", keyword: "向內探尋", upright: "先給自己一段安靜的時間沉澱思考", reversed: "太封閉自己,適時向外求助也沒關係" },
    { name: "命運之輪", keyword: "順勢而為", upright: "時機正在轉動,新的機會即將出現", reversed: "計畫可能有變化,保持彈性應對" },
    { name: "正義", keyword: "衡量與公正", upright: "誠實面對現況,做出對得起自己的決定", reversed: "留意雙方認知落差,溝通會化解誤會" },
    { name: "吊人", keyword: "換個角度", upright: "暫停下來,換個視角會看見不同答案", reversed: "拖延只會累積壓力,是時候做個決定了" },
    { name: "死神", keyword: "結束與重生", upright: "放下不再適合的,才有空間迎接新局", reversed: "抗拒改變讓自己更辛苦,順其自然吧" },
    { name: "節制", keyword: "調和平衡", upright: "找到中庸的節奏,事情會漸漸順暢", reversed: "步調失衡,提醒自己別走極端" },
    { name: "惡魔", keyword: "看見執念", upright: "誠實面對讓自己不自由的習慣或關係", reversed: "已經有能力掙脫束縛,相信自己做得到" },
    { name: "高塔", keyword: "打破重建", upright: "意外的變動其實是重新開始的契機", reversed: "與其抵抗變化,不如順勢調整腳步" },
    { name: "星星", keyword: "希望與療癒", upright: "低潮終將過去,美好的事正在靠近", reversed: "先照顧好自己,別急著給自己打分數" },
    { name: "月亮", keyword: "面對不安", upright: "情緒起伏是正常的,給自己多一點耐心", reversed: "困惑漸漸明朗,答案比想像中清楚" },
    { name: "太陽", keyword: "自信綻放", upright: "帶著自信前進,好事會自然發生", reversed: "別和他人比較,你的步調已經很好" },
    { name: "審判", keyword: "覺醒與整合", upright: "過去的經驗都是養分,勇敢迎接新的自己", reversed: "還在猶豫要不要跨出改變,給自己一點時間" },
    { name: "世界", keyword: "圓滿完成", upright: "一個階段即將圓滿,準備好迎接下一步", reversed: "還差臨門一腳,別在最後放棄" }
  ];

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
    getCredits: getCredits,
    useCredit: useCredit,
    addCredits: addCredits,
    API_URL: "https://healingasmr.vercel.app/api/tarot/reading"
  };
})(window);
