// 占卜報告書:把這次的問題、牌面與解讀畫成一張圖,方便存下來或用 LINE 傳給朋友。
//
// 全部用 Canvas 畫,不需要後端、不需要外部套件。牌面圖與本站同網域,
// 所以 canvas 不會被污染,toBlob 拿得到圖。
(function (global) {
  // 現場給客人看、客人再存到手機上,原本的字級在手機上要放大才讀得清楚。
  // 字級統一乘上 TEXT_SCALE(見 font()),版面寬度與留白同步放大,
  // 不然字變大就會擠在一起。
  var TEXT_SCALE = 1.5;
  var W = Math.round(1080 * TEXT_SCALE);
  var PAD = Math.round(64 * TEXT_SCALE);
  // 報告書是拿來「讀」的,不是拿來營造氣氛的。整張深紫看久了眼睛很累,
  // 所以改成白底深字;牌面本身已經夠華麗,底色安靜一點反而好看。
  var INK = "#33244a";             // 主文
  var DIM = "#7d6f92";             // 次要資訊
  var GOLD = "#a9741c";            // 重點字(白底上金色要壓深才看得清楚)
  var CARD_REF = "#6b4bb0";        // 牌名出處
  var LINE = "#e6ddf2";            // 分隔線
  var SITE = "vitokok-lab.github.io/Healing";

  function font(size, weight, display) {
    size = Math.round(size * TEXT_SCALE);
    var family = display
      ? '"Huninn","Noto Sans TC",system-ui,sans-serif'
      : '"Noto Sans TC",system-ui,sans-serif';
    return (weight || 400) + " " + size + "px " + family;
  }

  // ── 文字排版 ────────────────────────────────────────
  // 中文沒有空白可以斷,所以逐字量寬度。回傳每一行的「片段陣列」,
  // 片段帶著顏色資訊(重點金色、牌名淡紫),畫的時候才不用重算。
  function wrapSegs(ctx, segs, maxW, size) {
    var lines = [], cur = [], curW = 0;
    ctx.font = font(size);
    segs.forEach(function (seg) {
      var chars = seg.t.split("");
      var buf = "";
      for (var i = 0; i < chars.length; i++) {
        var ch = chars[i];
        if (ch === "\n") {
          if (buf) cur.push({ t: buf, k: seg.k });
          lines.push(cur); cur = []; curW = 0; buf = "";
          continue;
        }
        ctx.font = font(seg.k === "hi" ? size * 1.12 : size, seg.k === "hi" ? 600 : 400);
        var w = ctx.measureText(ch).width;
        if (curW + w > maxW && (buf || cur.length)) {
          if (buf) cur.push({ t: buf, k: seg.k });
          lines.push(cur); cur = []; curW = 0; buf = "";
        }
        buf += ch;
        curW += w;
      }
      if (buf) cur.push({ t: buf, k: seg.k });
    });
    if (cur.length) lines.push(cur);
    return lines;
  }

  function drawLines(ctx, lines, x, y, size, lh) {
    lines.forEach(function (line) {
      var cx = x;
      line.forEach(function (seg) {
        if (seg.k === "hi") {
          ctx.font = font(size * 1.12, 600);
          ctx.fillStyle = GOLD;
        } else if (seg.k === "ref") {
          ctx.font = font(size * 0.94, 400);
          ctx.fillStyle = CARD_REF;
        } else {
          ctx.font = font(size);
          ctx.fillStyle = INK;
        }
        ctx.fillText(seg.t, cx, y);
        cx += ctx.measureText(seg.t).width;
      });
      y += lh;
    });
    return y;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function loadImage(src) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };   // 載不到就留空位,不要整張報告失敗
      im.src = src;
    });
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "." +
      String(d.getMonth() + 1).padStart(2, "0") + "." +
      String(d.getDate()).padStart(2, "0");
  }

  // ── 主流程 ──────────────────────────────────────────
  // opts: { question, spreadName, cards:[{n,name,position,orientation}], readingSegs }
  // readingSegs 由呼叫端用 toSegs() 轉好(重點與牌名的標記已經拆開)
  function render(opts) {
    var cards = opts.cards || [];
    var cta = opts.cta || { top: "也想讓本喵幫你看一次嗎?", bottom: SITE };
    return Promise.all(cards.map(function (c) { return loadImage(opts.artOf(c.n)); }))
      .then(function (imgs) {
        // 先用暫時的 canvas 量高度,再開真正的畫布,才不會留一大片空白
        var m = document.createElement("canvas").getContext("2d");
        var innerW = W - PAD * 2;

        var qLines = wrapSegs(m, [{ t: opts.question || "", k: "" }], innerW, 36);
        var rLines = wrapSegs(m, opts.readingSegs || [], innerW, 36);

        // 牌面:一排最多 5 張
        var perRow = Math.min(cards.length, 5);
        var gap = 20;
        var cw = perRow ? Math.floor((innerW - gap * (perRow - 1)) / perRow) : 0;
        var chH = Math.round(cw * 12 / 7);
        var rows = perRow ? Math.ceil(cards.length / perRow) : 0;
        // 一張牌要留的高度:牌面 + 牌名(32)+ 正逆位(58)+ 下一排位置標籤的空間。
        // 少留就會像十張牌陣那樣,下一排的位置名壓到上一排的「正位」。
        var rowH = chH + 130;

        var H = PAD + 96 + 54                      // 標題區
          + 48 + qLines.length * 54 + 44           // 你問的(更大間距)
          + rows * rowH + 36                       // 牌面
          + 48 + rLines.length * 60 + 48           // 解讀(更大間距)
          + 28 + 120 + 44 + 56;                    // 頁尾:邀請框 + 一行小字 + 底部留白

        var cv = document.createElement("canvas");
        cv.width = W; cv.height = H;
        var ctx = cv.getContext("2d");

        // 底:白色。上緣留一條淡紫,認得出是解憂商店但不壓眼睛。
        ctx.fillStyle = "#fffdfa";
        ctx.fillRect(0, 0, W, H);
        var band = ctx.createLinearGradient(0, 0, W, 0);
        band.addColorStop(0, "#8f6fc9");
        band.addColorStop(1, "#c9a3e8");
        ctx.fillStyle = band;
        ctx.fillRect(0, 0, W, 10);
        var wash = ctx.createLinearGradient(0, 10, 0, 220);
        wash.addColorStop(0, "rgba(167,139,219,.13)");
        wash.addColorStop(1, "rgba(167,139,219,0)");
        ctx.fillStyle = wash;
        ctx.fillRect(0, 10, W, 210);

        var y = PAD + 62;
        ctx.textBaseline = "alphabetic";
        ctx.font = font(46, 400, true);
        ctx.fillStyle = INK;
        ctx.fillText("喵喵占卜報告書", PAD, y);

        y += 44;
        ctx.font = font(26);
        ctx.fillStyle = DIM;
        ctx.fillText("解憂商店 · " + today() + (opts.spreadName ? " · " + opts.spreadName : ""), PAD, y);

        y += 36;
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();

        y += 56;
        ctx.font = font(26, 500);
        ctx.fillStyle = GOLD;
        ctx.fillText("你問的", PAD, y);
        y += 44;
        y = drawLines(ctx, qLines, PAD, y, 36, 54);

        // 牌面
        y += 34;
        cards.forEach(function (c, i) {
          var col = i % perRow, row = Math.floor(i / perRow);
          var x = PAD + col * (cw + gap);
          var cy = y + row * rowH;

          ctx.font = font(21);
          ctx.fillStyle = GOLD;
          ctx.textAlign = "center";
          ctx.fillText(c.position || "", x + cw / 2, cy - 10, cw);

          roundRect(ctx, x, cy, cw, chH, 12);
          ctx.save();
          ctx.clip();
          if (imgs[i]) {
            // cover:填滿卡片框,不變形
            var r = Math.max(cw / imgs[i].width, chH / imgs[i].height);
            var dw = imgs[i].width * r, dh = imgs[i].height * r;
            if (c.orientation === "reversed") {
              ctx.translate(x + cw / 2, cy + chH / 2);
              ctx.rotate(Math.PI);
              ctx.drawImage(imgs[i], -dw / 2, -dh / 2, dw, dh);
            } else {
              ctx.drawImage(imgs[i], x + (cw - dw) / 2, cy + (chH - dh) / 2, dw, dh);
            }
          } else {
            ctx.fillStyle = "#efe8f8";
            ctx.fillRect(x, cy, cw, chH);
          }
          ctx.restore();
          roundRect(ctx, x, cy, cw, chH, 12);
          ctx.strokeStyle = "rgba(143,111,201,.45)";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.font = font(23, 400, true);
          ctx.fillStyle = INK;
          ctx.fillText(c.name, x + cw / 2, cy + chH + 32, cw);
          ctx.font = font(19);
          ctx.fillStyle = c.orientation === "upright" ? DIM : GOLD;
          ctx.fillText(c.orientation === "upright" ? "正位" : "逆位", x + cw / 2, cy + chH + 58, cw);
          ctx.textAlign = "left";
        });
        y += rows * rowH + 30;

        ctx.font = font(26, 500);
        ctx.fillStyle = GOLD;
        ctx.fillText("本喵的解讀", PAD, y);
        y += 48;
        y = drawLines(ctx, rLines, PAD, y, 36, 60);

        // 頁尾:收到圖的人要知道去哪裡也算一次,所以連結要大要清楚
        y += 28;
        roundRect(ctx, PAD, y, W - PAD * 2, 120, 16);
        ctx.fillStyle = "#f4eefc";
        ctx.fill();
        ctx.strokeStyle = "#ded0f0";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.font = font(24);
        ctx.fillStyle = DIM;
        // 這塊footer的兩行字可以由呼叫端換掉。
        // 手機付費版沿用預設(導回占卜頁拉客);桌面現場版會換成 LINE 導客——
        // 那張圖是要給現場客人帶走的,印上占卜頁網址等於告訴他們怎麼繞過付費。
        ctx.fillText(cta.top, W / 2, y + 44);
        ctx.font = font(28, 500);
        ctx.fillStyle = "#6c4fa8";
        ctx.fillText(cta.bottom, W / 2, y + 86);
        ctx.textAlign = "left";

        y += 120 + 44;
        ctx.font = font(21);
        ctx.fillStyle = DIM;
        ctx.fillText("Jessica 解憂商店 · 喵喵占卜", PAD, y);
        ctx.textAlign = "right";
        ctx.fillText("僅供參考,重要決定請自己做主", W - PAD, y);
        ctx.textAlign = "left";

        return cv;
      });
  }

  // 存圖或分享。手機支援 Web Share 就直接叫出分享面板(可以選 LINE),
  // 不支援就退回下載,客人自己貼到 LINE 也行。
  function shareOrSave(canvas, onState) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        if (!blob) { onState && onState("error"); resolve(false); return; }
        var name = "喵喵占卜報告_" + today().replace(/\./g, "") + ".png";
        var file = new File([blob], name, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
          // 圖片裡的網址是不能點的,所以連結一定要放在文字裡一起送出去——
          // LINE 會把訊息中的網址自動變成可點的連結,收到的人才回得來。
          navigator.share({
            files: [file],
            title: "喵喵占卜報告書",
            text: "本喵幫我算了一次,分享給你看~\n也想算算看嗎? https://" + SITE + "/tarot.html"
          })
            .then(function () { onState && onState("shared"); resolve(true); })
            .catch(function () { onState && onState("cancel"); resolve(false); });
          return;
        }
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        onState && onState("saved");
        resolve(true);
      }, "image/png");
    });
  }

  global.TarotReport = { render: render, shareOrSave: shareOrSave, canShare: function () {
    return !!(navigator.canShare && navigator.share);
  } };
})(window);
