/* 今日牌分享卡(規格 §6 v1 第 3 項):
 * canvas 合成 1080x1920 直式圖(牌面 + 牌名 + 短評第一句 + 品牌 + 邀請文案),
 * 走 Web Share API 分享;不支援時開新分頁讓客人長按存圖。
 * 牌面圖與頁面同網域,canvas 不會被汙染。 */
(function () {
  "use strict";

  var W = 1080;
  var H = 1920;

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
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  // 短評取第一句當卡上的一句話(去掉標記括號)
  function oneLiner(text) {
    var clean = String(text || "").replace(/[【】〔〕]/g, "");
    var m = clean.match(/[^。!?!?]+[。!?!?]?/);
    var line = m ? m[0] : clean;
    return line.length > 38 ? line.slice(0, 37) + "…" : line;
  }

  function build(card, dailyText) {
    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");

    // 底:夜空漸層 + 微光
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#241a3a");
    bg.addColorStop(0.55, "#17131f");
    bg.addColorStop(1, "#121019");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(W / 2, 640, 80, W / 2, 640, 620);
    glow.addColorStop(0, "rgba(232,176,75,0.28)");
    glow.addColorStop(1, "rgba(232,176,75,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // 標題
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd98c";
    ctx.font = "500 44px 'Huninn','Noto Sans TC',sans-serif";
    ctx.fillText("今 日 一 牌", W / 2, 170);

    var nn = card.n < 10 ? "0" + card.n : String(card.n);
    return loadImage("../tarot/assets/cards/" + nn + ".webp").then(function (img) {
      // 牌面(逆位轉 180 度)
      var cw = 560;
      var ch = 880;
      var cx = (W - cw) / 2;
      var cy = 240;
      ctx.save();
      roundRect(ctx, cx, cy, cw, ch, 28);
      ctx.clip();
      if (card.orientation === "reversed") {
        ctx.translate(W / 2, cy + ch / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(img, -cw / 2, -ch / 2, cw, ch);
      } else {
        ctx.drawImage(img, cx, cy, cw, ch);
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(255,214,140,0.7)";
      ctx.lineWidth = 4;
      roundRect(ctx, cx, cy, cw, ch, 28);
      ctx.stroke();

      // 牌名
      ctx.fillStyle = "#f3eefc";
      ctx.font = "700 64px 'Huninn','Noto Sans TC',sans-serif";
      ctx.fillText(
        card.name + (card.orientation === "reversed" ? "(逆位)" : ""),
        W / 2,
        cy + ch + 110
      );

      // 一句話
      ctx.fillStyle = "#cfc4e4";
      ctx.font = "400 42px 'Noto Sans TC',sans-serif";
      ctx.fillText(oneLiner(dailyText), W / 2, cy + ch + 190);

      // 品牌與邀請
      ctx.fillStyle = "#8e83a6";
      ctx.font = "400 34px 'Noto Sans TC',sans-serif";
      ctx.fillText("喵喵占卜 · 每天一張牌", W / 2, H - 150);
      ctx.fillStyle = "#ffd98c";
      ctx.font = "500 36px 'Noto Sans TC',sans-serif";
      ctx.fillText("加 LINE 好友,本喵也幫你看今天", W / 2, H - 90);

      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) { resolve(blob); }, "image/jpeg", 0.9);
      });
    });
  }

  function share(card, dailyText) {
    return build(card, dailyText).then(function (blob) {
      var file = new File([blob], "meow-tarot-today.jpg", { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: "今日一牌" }).catch(function () {});
      }
      // 退路:開新分頁,長按存圖
      var url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    });
  }

  window.LiffShare = { share: share };
})();
