/* 寶石推薦——清單是店主實際的庫存。
 *
 * 不另外做選寶石的問卷:客人選的主題、抽到的牌、正逆位,已經足夠說出
 * 他現在的心境。占卜結果旁邊直接推一顆對得上那個心境的石頭,
 * 客人不必多按任何一步。
 *
 * 要加減貨就改 FAMILIES 裡的 stones 陣列。
 *
 * 放實拍照片:在那一顆加上 img 欄位,例如
 *     { name: "紫水晶", img: "amethyst.png", ... }
 * 檔案放 assets/stones/ 底下,去背 PNG,方形、建議 400×400 以上。
 * 沒有 img 的就自動用 color/accent 畫的漸層球代替,所以可以一顆一顆
 * 慢慢補,不必等全部到齊才上線。
 * want 是拿來跟心境配對的標籤,五選一:
 *   calm 安定 / courage 勇氣 / love 桃花 / wealth 財運 / clarity 清晰
 */
(function (global) {
  "use strict";

  var FAMILIES = [
    {
      id: "red", label: "紅色系", swatch: "#b8283c",
      stones: [
        { name: "紅寶石",   color: "#c62a45", accent: "#7d1226", want: "courage", line: "想要的東西,值得你開口去要。" },
        { name: "石榴石",   color: "#a63246", accent: "#6f1c2c", want: "courage", line: "撐過去的人不是不累,是知道自己撐得住。" },
        { name: "南紅瑪瑙", color: "#c04a35", accent: "#7c2618", want: "courage", line: "把猶豫的時間拿去做,做了就不慌了。" }
      ]
    },
    {
      id: "pink", label: "粉色系", swatch: "#e79ab0",
      stones: [
        { name: "粉鑽",     color: "#f2b9c9", accent: "#c8798f", want: "love", line: "你值得被很好地對待,包括被自己。" },
        { name: "粉碧璽",   color: "#e894ac", accent: "#b85a78", want: "love", line: "心軟不是弱點,但要記得留一份給自己。" },
        { name: "摩根石",   color: "#f0c4bd", accent: "#c08a80", want: "love", line: "溫柔的人不吃虧,只是回報來得慢一點。" },
        { name: "紫鋰輝石", color: "#e0aed0", accent: "#a86d9c", want: "love", line: "先把心裡那道結解開,人才走得進來。" },
        { name: "草莓晶",   color: "#e88fa4", accent: "#b35670", want: "love", line: "桃花不是等來的,是你狀態好了自己走過來的。" },
        { name: "粉晶",     color: "#f0c2ce", accent: "#d2879c", want: "love", line: "先對自己好一點,其他的會跟上。" }
      ]
    },
    {
      id: "orange", label: "橙色系", swatch: "#e07f3c",
      stones: [
        { name: "芬達石",   color: "#f0904a", accent: "#bd5a1c", want: "courage", line: "亮一點沒關係,你本來就該被看見。" },
        { name: "太陽石",   color: "#e8873f", accent: "#b2531a", want: "courage", line: "沒有力氣的時候,先曬一下自己。" },
        { name: "琥珀",     color: "#dba33e", accent: "#9c6a15", want: "calm",    line: "時間會把該留的留下來,不用急。" }
      ]
    },
    {
      id: "yellow", label: "黃色系", swatch: "#e8bc4a",
      stones: [
        { name: "貓眼石",   color: "#d8b45c", accent: "#9a7a20", want: "wealth",  line: "看準了再出手,你的眼光比你以為的準。" },
        { name: "金運石",   color: "#e8c257", accent: "#ab8a18", want: "wealth",  line: "運氣一直有來,差別在你有沒有伸手。" },
        { name: "黃水晶",   color: "#f2c95c", accent: "#c99418", want: "wealth",  line: "把機會接住,不必等更好的那一個。" },
        { name: "鈦晶",     color: "#e0b962", accent: "#a3801e", want: "wealth",  line: "格局打開,小錢會自己找上門。" },
        { name: "蜜蠟",     color: "#e5ab48", accent: "#a97418", want: "calm",    line: "慢下來的人,反而先到。" },
        { name: "黃鐵礦",   color: "#d4b86a", accent: "#96792c", want: "wealth",  line: "會賺的人很多,留得住的人才走得遠。" }
      ]
    },
    {
      id: "green", label: "綠色系", swatch: "#4f9e63",
      stones: [
        { name: "祖母綠",   color: "#3f9c6b", accent: "#1d6440", want: "wealth",  line: "沉得住氣的人,拿得到最好的那一份。" },
        { name: "翡翠",     color: "#54a878", accent: "#2a6d49", want: "calm",    line: "溫潤的東西最耐久,人也是。" },
        { name: "薄荷碧璽", color: "#7fcfae", accent: "#3f9376", want: "clarity", line: "把心裡那口濁氣換掉,想法就清了。" },
        { name: "沙弗萊石", color: "#41a45c", accent: "#1e6b33", want: "wealth",  line: "你缺的不是機會,是把它做完的耐性。" },
        { name: "橄欖石",   color: "#8fbc55", accent: "#5a8226", want: "calm",    line: "把過不去的事放下,位置留給新的。" },
        { name: "綠水晶",   color: "#6fb884", accent: "#357a4c", want: "wealth",  line: "先把手邊那個做好,不必等一個大機會。" },
        { name: "綠幽靈",   color: "#5c9c72", accent: "#2c6440", want: "wealth",  line: "一步一步累積的,才拿得穩。" },
        { name: "透輝石",   color: "#66b39a", accent: "#2f7562", want: "clarity", line: "看清楚了,選擇就不難了。" },
        { name: "孔雀石",   color: "#2f8f7d", accent: "#155a4d", want: "calm",    line: "會拒絕的人,才留得住自己的力氣。" },
        { name: "天河石",   color: "#78c8c0", accent: "#3a8a84", want: "clarity", line: "你不是不會說,是還沒決定要說什麼。" },
        { name: "葡萄石",   color: "#a8cf8a", accent: "#6b9450", want: "calm",    line: "把期待放輕一點,日子會鬆一點。" }
      ]
    },
    {
      id: "blue", label: "藍色系", swatch: "#3c6bb0",
      stones: [
        { name: "藍寶石",   color: "#2f5aa8", accent: "#153469", want: "clarity", line: "做出清楚的決定,不再模糊。" },
        { name: "海藍寶",   color: "#7fc4d8", accent: "#3d8598", want: "clarity", line: "話說得溫和,力道不會比較小。" },
        { name: "拓帕石",   color: "#5ba8d0", accent: "#256f94", want: "clarity", line: "把事情排出先後,就沒那麼可怕了。" },
        { name: "拉貢",     color: "#4a8fc4", accent: "#1e5787", want: "clarity", line: "想通的那一刻,路就出現了。" },
        { name: "坦桑石",   color: "#5a5fb0", accent: "#2c2f74", want: "calm",    line: "深一點的顏色,適合沉澱的人。" },
        { name: "鋯石",     color: "#7fb0d4", accent: "#3d7599", want: "clarity", line: "亮起來的東西,總會被看見。" },
        { name: "藍晶石",   color: "#4479b8", accent: "#1c477c", want: "clarity", line: "把心裡那條線拉直,人就不亂了。" },
        { name: "堇青石",   color: "#5a5a9c", accent: "#2b2b66", want: "calm",    line: "方向不清楚的時候,先停下來。" },
        { name: "磷灰石",   color: "#3fa8b8", accent: "#186f7d", want: "courage", line: "想講的話,今天就講。" },
        { name: "青金石",   color: "#3b5aa8", accent: "#1f3468", want: "clarity", line: "把話講清楚,誤會就少一半。" },
        { name: "綠松石",   color: "#4fb8b0", accent: "#1f7d76", want: "calm",    line: "走遠路的人,需要一個護身的東西。" },
        { name: "海紋石",   color: "#8fc8d4", accent: "#4a8b99", want: "calm",    line: "像海一樣,起伏過後還是會平。" }
      ]
    },
    {
      id: "purple", label: "紫色系", swatch: "#8f5cb8",
      stones: [
        { name: "紫龍晶",   color: "#8f6fb8", accent: "#57377c", want: "calm",    line: "把界線立起來,關係反而好。" },
        { name: "紫水晶",   color: "#b98fdc", accent: "#7d4fae", want: "calm",    line: "戴著它,思緒會慢到你聽得見自己。" },
        { name: "舒俱萊",   color: "#9c5fa8", accent: "#5f2b6b", want: "calm",    line: "先把自己顧好,再去顧別人。" }
      ]
    },
    {
      id: "brown", label: "棕色系", swatch: "#8a6a48",
      stones: [
        { name: "髮晶",     color: "#c9a06a", accent: "#8a6530", want: "wealth",  line: "底子紮實的人,運氣來了接得住。" },
        { name: "茶晶",     color: "#8f7050", accent: "#573f28", want: "calm",    line: "把雜訊擋掉,你需要的是安靜。" },
        { name: "虎眼石",   color: "#b08a3c", accent: "#6f5215", want: "courage", line: "看準了就走,不必回頭問人。" }
      ]
    },
    {
      id: "black", label: "黑色系", swatch: "#2e2a33",
      stones: [
        { name: "黑曜岩",   color: "#3a3540", accent: "#17141c", want: "calm",    line: "擋掉不必要的,你才留得住力氣。" }
      ]
    },
    {
      id: "white", label: "白 / 透明系", swatch: "#dfe3ee",
      stones: [
        { name: "天然鑽石",     color: "#e8ecf5", accent: "#a8b0c4", want: "clarity", line: "夠硬的東西,才撐得起夠久的關係。" },
        { name: "培育鑽石",     color: "#e4eaf4", accent: "#a2accf", want: "clarity", line: "來源清楚的東西,戴起來也安心。" },
        { name: "鑽石 / 莫桑",  color: "#eef1f8", accent: "#b0b8ca", want: "clarity", line: "亮不亮不是重點,耐不耐得住才是。" },
        { name: "月光石",       color: "#dfe6f5", accent: "#a8b8de", want: "calm",    line: "它不催你做決定,只讓你睡得著。" },
        { name: "幽靈",         color: "#dcdfe8", accent: "#9ea6ba", want: "wealth",  line: "一層一層長起來的,拆不掉。" },
        { name: "閃靈水晶",     color: "#eaeef7", accent: "#aeb6c8", want: "clarity", line: "把心裡的雜訊清掉,答案就浮出來。" },
        { name: "原礦透石膏",   color: "#f0f0ea", accent: "#c0bfb2", want: "calm",    line: "柔軟的東西也可以很有力量。" },
        { name: "珍珠",         color: "#f2ece4", accent: "#c8bcab", want: "love",    line: "被磨過的東西,才有那層光。" }
      ]
    },
    {
      id: "multi", label: "彩色 / 漸層系", swatch: "#9c7fc8",
      stones: [
        { name: "碧璽",     color: "#c86f9c", accent: "#8a3866", want: "love",    line: "每一面都是你,不用只挑一面給人看。" },
        { name: "尖晶石",   color: "#c0405c", accent: "#7d1a30", want: "courage", line: "顏色濃的人,不需要為此道歉。" },
        { name: "拉長石",   color: "#7d8fa6", accent: "#46566e", want: "calm",    line: "會拒絕的人,才留得住自己的力氣。" },
        { name: "剛玉",     color: "#a86f8f", accent: "#6b3455", want: "courage", line: "夠硬,是因為經歷過夠多。" },
        { name: "歐泊",     color: "#a8c4d8", accent: "#6b8ba8", want: "love",    line: "你身上的光,轉個角度就不一樣。" },
        { name: "紫黃晶",   color: "#c49ad0", accent: "#8a5c9c", want: "wealth",  line: "兩種都想要,其實可以都要。" },
        { name: "超七",     color: "#9c7fb8", accent: "#5f4a7c", want: "clarity", line: "想得多的人,需要一顆幫忙收斂的。" },
        { name: "螢石",     color: "#7fc4b4", accent: "#3f8878", want: "clarity", line: "事情不會變少,但可以變得有順序。" },
        { name: "玉髓",     color: "#d8a894", accent: "#a06a54", want: "calm",    line: "溫的東西最好戴,天天戴不膩。" },
        { name: "彼得石",   color: "#8a9c8f", accent: "#4f5f54", want: "courage", line: "變動的時候,穩住的人贏。" },
        { name: "黃銅礦",   color: "#c8a850", accent: "#8a6f18", want: "wealth",  line: "看起來像金子的,不一定比較差。" },
        { name: "鉍晶體",   color: "#8fa8c8", accent: "#4f6b94", want: "clarity", line: "規則長出來的東西,自有它的美。" },
        { name: "斑彩石",   color: "#a8905c", accent: "#6b5628", want: "wealth",  line: "夠老的東西,才有那個層次。" },
        { name: "綜合",     color: "#b89ccc", accent: "#7a5c94", want: "love",    line: "不必只選一顆,搭起來才是你。" }
      ]
    }
  ];

  // ── 從占卜結果推薦一顆石頭 ────────────────────────────────
  // 不另外問客人問題:他選的主題、抽到的牌、正逆位,已經足夠說出
  // 他現在的心境。這裡把那個心境翻成一顆真的賣得出去的石頭。

  var WANT_LABEL = {
    calm:    "安定下來",
    courage: "把事情推出去",
    love:    "把心打開",
    wealth:  "把機會接住",
    clarity: "把事情想清楚"
  };

  var TOPIC_WANT = {
    love: "love", career: "courage", money: "wealth",
    decision: "clarity", other: "calm"
  };

  // 小牌的花色會透露心境落在哪一塊,比主題更貼近「這一次」的狀態
  var SUIT_WANT = [
    { prefix: "權杖", want: "courage" },
    { prefix: "聖杯", want: "love" },
    { prefix: "寶劍", want: "clarity" },
    { prefix: "錢幣", want: "wealth" }
  ];

  function recommend(topic, cards) {
    cards = cards || [];
    var score = { calm: 0, courage: 0, love: 0, wealth: 0, clarity: 0 };

    // 主題是客人自己講的,權重最高
    var base = TOPIC_WANT[topic] || "calm";
    score[base] += 3;

    var reversed = 0;
    cards.forEach(function (c) {
      if (c.orientation === "reversed") reversed += 1;
      for (var i = 0; i < SUIT_WANT.length; i++) {
        if (String(c.name).indexOf(SUIT_WANT[i].prefix) === 0) {
          score[SUIT_WANT[i].want] += 1;
          break;
        }
      }
    });

    // 逆位偏多 = 現在卡著、推不動,那先需要的是安定而不是衝
    var mostlyReversed = cards.length > 0 && reversed / cards.length >= 0.5;
    if (mostlyReversed) score.calm += 2;

    var want = base, best = -1;
    Object.keys(score).forEach(function (k) {
      if (score[k] > best) { best = score[k]; want = k; }
    });

    // 同一次占卜要推薦同一顆,所以用牌面本身當種子,而不是亂數
    var seed = cards.reduce(function (a, c) { return a + (c.n || 0) + (c.orientation === "reversed" ? 7 : 0); }, 0);

    var matches = [];
    FAMILIES.forEach(function (f) {
      f.stones.forEach(function (st) {
        if (st.want === want) matches.push({ stone: st, family: f });
      });
    });
    if (!matches.length) {
      FAMILIES.forEach(function (f) { f.stones.forEach(function (st) { matches.push({ stone: st, family: f }); }); });
    }

    var hit = matches[seed % matches.length];

    var why = mostlyReversed
      ? "牌面逆位偏多,現在不是往前衝的時候——先" + WANT_LABEL[want] + "。"
      : "這次的牌都指向同一件事:" + WANT_LABEL[want] + "。";

    return {
      stone: hit.stone,
      family: hit.family,
      want: want,
      wantLabel: WANT_LABEL[want],
      why: why
    };
  }

  // 有實拍照就用照片,沒有就退回漸層球。
  // 這樣店主可以一顆一顆補圖,不必等 60 幾顆全部到齊。
  var STONE_DIR = "./assets/stones/";

  function imageFor(stone) {
    return stone && stone.img ? STONE_DIR + stone.img : "";
  }

  global.Gem = {
    FAMILIES: FAMILIES,
    STONE_DIR: STONE_DIR,
    imageFor: imageFor,
    recommend: recommend
  };
})(window);
