// 結帳頁付款模擬:純前端、無後端、不會送出任何資料。
// 卡號/效期/安全碼欄位提供輸入格式化,提交後顯示處理中→成功的模擬流程。
// ?gift=1 會切換成送禮模式:顯示收件人欄位,成功畫面改為產生禮物碼。
// 信用卡 / LINE Pay 分頁切換:切換時同步更新按鈕文案與付款方說明。
document.addEventListener("DOMContentLoaded", function () {
  var isGift = new URLSearchParams(location.search).get("gift") === "1";
  if (isGift) document.body.classList.add("is-gift");

  var submitBtn = document.getElementById("pay-submit");
  var providerNote = document.getElementById("pay-provider-note");
  var method = "card";

  function updateSubmitLabel() {
    if (!submitBtn) return;
    var price = submitBtn.dataset.price || "";
    var verb;
    if (method === "linepay") {
      verb = isGift ? "LINE Pay 付款並贈送" : "使用 LINE Pay 付款";
    } else {
      verb = isGift ? "確認付款並贈送" : submitBtn.dataset.verb || "確認付款";
    }
    submitBtn.textContent = price ? verb + " " + price : verb;
    submitBtn.classList.toggle("is-linepay", method === "linepay");
    if (providerNote) {
      providerNote.textContent = method === "linepay"
        ? "LINE Pay 由 LY Corporation 提供,本站不會取得您的 LINE 付款資訊。"
        : providerNote.dataset.cardText || providerNote.textContent;
    }
  }

  var tabs = document.querySelectorAll(".pay-method-tab");
  var panels = document.querySelectorAll(".pay-method-panel");
  var cardOnlyInputs = document.querySelectorAll('[data-panel="card"] [required]');
  if (providerNote) providerNote.dataset.cardText = providerNote.textContent.trim();
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      method = tab.dataset.method;
      tabs.forEach(function (t) { t.classList.toggle("active", t === tab); });
      panels.forEach(function (p) { p.classList.toggle("active", p.dataset.panel === method); });
      cardOnlyInputs.forEach(function (input) { input.required = method === "card"; });
      updateSubmitLabel();
    });
  });
  updateSubmitLabel();

  var cardNumber = document.getElementById("cardNumber");
  if (cardNumber) {
    cardNumber.addEventListener("input", function (e) {
      var v = e.target.value.replace(/\D/g, "").slice(0, 16);
      e.target.value = (v.match(/.{1,4}/g) || []).join(" ");
    });
  }

  var expiry = document.getElementById("cardExpiry");
  if (expiry) {
    expiry.addEventListener("input", function (e) {
      var v = e.target.value.replace(/\D/g, "").slice(0, 4);
      if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
      e.target.value = v;
    });
  }

  var cvc = document.getElementById("cardCvc");
  if (cvc) {
    cvc.addEventListener("input", function (e) {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 3);
    });
  }

  var form = document.getElementById("pay-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = document.getElementById("pay-submit");
      btn.disabled = true;
      btn.dataset.label = btn.textContent;
      btn.textContent = "處理中⋯";
      btn.style.opacity = ".65";
      setTimeout(function () {
        form.style.display = "none";
        if (isGift) {
          var codeEl = document.getElementById("giftCode");
          if (codeEl) {
            var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var seg = function () {
              var s = "";
              for (var i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
              return s;
            };
            codeEl.textContent = "GIFT-" + seg() + "-" + seg();
          }
        }
        document.getElementById("pay-success").style.display = "block";
        document.getElementById("pay-success").scrollIntoView({ behavior: "smooth", block: "center" });
      }, 1400);
    });
  }
});
