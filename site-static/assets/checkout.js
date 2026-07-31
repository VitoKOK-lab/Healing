// 結帳頁刷卡模擬:純前端、無後端、不會送出任何資料。
// 卡號/效期/安全碼欄位提供輸入格式化,提交後顯示處理中→成功的模擬流程。
document.addEventListener("DOMContentLoaded", function () {
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
        document.getElementById("pay-success").style.display = "block";
        document.getElementById("pay-success").scrollIntoView({ behavior: "smooth", block: "center" });
      }, 1400);
    });
  }
});
