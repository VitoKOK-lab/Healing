/* 特效引擎(規格 §6.2)。對外只有一個入口:
 *   LiffFX.celebrate({ el, major, keyCard, tier, firstSeen })
 * 分級:L2(關鍵好牌)> L1(大牌)> 無;T1 另外撒花;初遇由頁面自己顯示徽章。
 * 手機震動只在 L2(Android 有效,iOS 無 API 自動略過)。 */
(function () {
  "use strict";

  var CONFETTI_COLORS = ["#e8b04b", "#ffd98c", "#b78ae8", "#8ad0c8", "#f2a1b5"];

  function spawn(parent, className, styles, ttl) {
    var el = document.createElement("div");
    el.className = className;
    Object.keys(styles).forEach(function (k) {
      if (k.indexOf("--") === 0) el.style.setProperty(k, styles[k]);
      else el.style[k] = styles[k];
    });
    parent.appendChild(el);
    setTimeout(function () { el.remove(); }, ttl);
    return el;
  }

  // L1:牌周圍飄星塵
  function stardust(anchor, count) {
    var rect = anchor.getBoundingClientRect();
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var dist = 60 + Math.random() * 90;
      spawn(document.body, "fx-dust", {
        left: rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width + "px",
        top: rect.top + rect.height / 2 + (Math.random() - 0.5) * rect.height + "px",
        position: "fixed",
        "--dx": Math.cos(angle) * dist + "px",
        "--dy": Math.sin(angle) * dist - 60 + "px",
        "--dur": 1.2 + Math.random() * 0.9 + "s",
      }, 2400);
    }
  }

  // L2:全螢幕光爆 + 放射線
  function burst() {
    var overlay = document.createElement("div");
    overlay.className = "fx-burst";
    var rays = [];
    for (var i = 0; i < 14; i++) {
      var a = (i / 14) * 360;
      rays.push(
        '<line x1="50%" y1="46%" x2="' + (50 + 46 * Math.cos((a * Math.PI) / 180)) +
        '%" y2="' + (46 + 46 * Math.sin((a * Math.PI) / 180)) +
        '%" stroke-dasharray="10 26" style="animation-delay:' + (i % 5) * 40 + 'ms" />'
      );
    }
    overlay.innerHTML = "<svg>" + rays.join("") + "</svg>";
    document.body.appendChild(overlay);
    setTimeout(function () { overlay.remove(); }, 1300);
  }

  // L2:貓咪撲上來(手繪貓同款線條,開心表情)
  var CAT_SVG =
    '<svg class="cat-art" viewBox="0 0 100 100" aria-hidden="true">' +
    '<g class="cat-ears"><path class="cat-ear" d="M31 52 L33.5 26 L50.5 41 Z"/>' +
    '<path class="cat-ear" d="M69 52 L66.5 26 L49.5 41 Z"/>' +
    '<path class="cat-ear-in" d="M35.5 47 L37 33 L45.5 42 Z"/>' +
    '<path class="cat-ear-in" d="M64.5 47 L63 33 L54.5 42 Z"/></g>' +
    '<ellipse class="cat-head" cx="50" cy="66" rx="25" ry="22"/>' +
    '<path class="cat-lash" d="M37 65.5 q5.2 -5.6 10.4 0M52.6 65.5 q5.2 -5.6 10.4 0"/>' +
    '<path class="cat-whisker" d="M31 69 L12 65M31 73 L12 75M69 69 L88 65M69 73 L88 75"/>' +
    '<path class="cat-nose" d="M46.6 70 L53.4 70 L50 74.2 Z"/>' +
    '<path class="cat-mouth" d="M50 74.2 v2.6M50 76.8 q-3.6 3.4 -6.6 .2M50 76.8 q3.6 3.4 6.6 .2"/>' +
    "</svg>";

  function catPounce() {
    var el = document.createElement("div");
    el.className = "fx-cat-pounce";
    el.innerHTML = CAT_SVG;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1400);
  }

  // T1:輕撒花
  function confetti(count) {
    for (var i = 0; i < count; i++) {
      spawn(document.body, "fx-confetti", {
        left: Math.random() * 100 + "vw",
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        "--dur": 2 + Math.random() * 1.6 + "s",
        "--spin": (Math.random() > 0.5 ? "" : "-") + (360 + Math.random() * 540) + "deg",
        animationDelay: Math.random() * 0.7 + "s",
      }, 4600);
    }
  }

  window.LiffFX = {
    celebrate: function (opts) {
      var el = opts.el;
      if (opts.keyCard) {
        // L2:光爆 + 貓撲 + 星塵加量 + 震動
        burst();
        setTimeout(catPounce, 240);
        if (el) stardust(el, 26);
        if (navigator.vibrate) navigator.vibrate([60, 40, 90]);
      } else if (opts.major) {
        // L1:金暈(class 由頁面掛)+ 星塵
        if (el) {
          el.classList.add("fx-major");
          stardust(el, 12);
        }
      }
      if (opts.tier === "T1") setTimeout(function () { confetti(36); }, 500);
    },
  };
})();
