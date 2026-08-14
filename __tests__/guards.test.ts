import { describe, expect, it } from "vitest";
import { check, passes, splitParagraphs } from "@/lib/tarot/guards";
import { parseDirection, verifyDirection, needsDirectionCheck } from "@/lib/tarot/direction";

// 一段合格的付費四段式(收斂專業型):四段、第二段問句收束、
// 第三段有時間尺度、第四段單一動作、無罐頭句無語尾助詞。
const GOOD_PAID = `這副牌的方向很清楚:你在這件事上的力氣沒有用錯,真正擋著你的是〔寶劍八逆位〕照出來的那個念頭——你以為的限制,大半不是真的存在。牌翻開時,貓尾巴輕輕掃過桌面。整體是【往前推的能量】,只是被你自己按了暫停。

往內看一層,你其實不是在等機會,而是在等一個「保證不會失敗」的信號。〔錢幣七正位〕說東西還在長,只是還沒到收成的時候;你急的不是進度,是【不確定感本身】。如果把「一定要一次成功」這個前提拿掉,你還會這麼緊繃嗎?

務實面的槓桿在時間安排上。這週先把你想做的那件事拆成三個可以獨立完成的小塊,三個月內只推進第一塊;〔權杖八正位〕顯示流速會在你真正動起來之後自己加快,你不需要在起點就把終點想完。方向是【先動再修】,不是先想到完美再動。

明天挑一個小塊,直接動手做完它。`;

const cards = ["寶劍八", "錢幣七", "權杖八"];
void cards;

describe("付費層審核:合格範例", () => {
  it("四段式合格文全數通過", () => {
    expect(check(GOOD_PAID, "paid")).toEqual([]);
  });

  it("免費層允許本喵語尾", () => {
    const free = "本喵幫你看過了喵。今天的〔太陽正位〕說你可以大方一點,想做的事直接去做,好事會自己靠過來。";
    expect(passes(free, "free")).toBe(true);
  });
});

describe("付費層審核:每條規則的反例", () => {
  const swap = (para: number, replacement: string) => {
    const p = splitParagraphs(GOOD_PAID);
    p[para] = replacement;
    return p.join("\n\n");
  };

  it("罐頭句:僅供參考/緣分自有安排/相信自己/明天起床", () => {
    for (const bad of [
      "以上僅供參考。",
      "緣分自有安排,不必強求。",
      "最重要的是相信自己。",
      "明天起床,你可以先做一件小事。",
      "明天一早就把訊息傳出去。",
    ]) {
      const t = GOOD_PAID + "\n\n" + bad;
      expect(check(t, "paid").some((v) => v.rule === "filler" || v.rule === "structure")).toBe(true);
    }
  });

  it("方法論名字漏出來", () => {
    const t = swap(1, "從阿德勒的角度看,你在等一個保證。這樣的等待值得嗎?");
    expect(check(t, "paid").some((v) => v.rule === "names")).toBe(true);
  });

  it("逐張報牌句型", () => {
    const t = swap(0, "第一張牌是寶劍八,說你被困住;先看懂它,再看下一張。牌面整體【偏正向】。");
    expect(check(t, "paid").some((v) => v.rule === "per-card")).toBe(true);
  });

  it("彎引號", () => {
    const t = swap(0, "牌面說你在等一個“保證”,但那個保證不存在。整體【方向向前】。");
    expect(check(t, "paid").some((v) => v.rule === "quotes")).toBe(true);
  });

  it("emoji", () => {
    const t = GOOD_PAID.replace("直接動手做完它。", "直接動手做完它 ✨。");
    expect(check(t, "paid").some((v) => v.rule === "emoji")).toBe(true);
  });

  it("付費層語尾助詞", () => {
    const t = GOOD_PAID.replace("直接動手做完它。", "直接動手做完它喔。");
    expect(check(t, "paid").some((v) => v.rule === "tail-particle")).toBe(true);
  });

  it("簡體字", () => {
    const t = GOOD_PAID.replace("方向很清楚", "方向很清楚,这一点毫無疑問");
    expect(check(t, "paid").some((v) => v.rule === "simplified")).toBe(true);
  });

  it("大陸用語:靠譜/拉黑/微信/處對象/挺好", () => {
    for (const bad of [
      "他這個人其實蠻靠譜的",
      "先把他拉黑冷靜一下",
      "傳個微信問清楚",
      "要不要開始找對象",
      "牌面看起來挺好",
    ]) {
      const t = GOOD_PAID.replace("直接動手做完它。", "直接動手做完它。" + bad + "。");
      expect(check(t, "paid").some((v) => v.rule === "cn-term")).toBe(true);
    }
  });

  it("台灣正常用法不誤殺:交往對象/考試通過/項目", () => {
    for (const okText of ["你們是穩定交往對象", "面試通過之後再說", "把該做的項目列出來"]) {
      const t = GOOD_PAID.replace("直接動手做完它。", "直接動手做完它," + okText + "。");
      expect(check(t, "paid").some((v) => v.rule === "cn-term")).toBe(false);
    }
  });

  it("段數不對", () => {
    const t = splitParagraphs(GOOD_PAID).slice(0, 3).join("\n\n");
    expect(check(t, "paid").some((v) => v.rule === "structure")).toBe(true);
  });

  it("第二段沒用問句收束", () => {
    const t = swap(1, "你其實是在等一個保證不會失敗的信號,〔錢幣七正位〕說時候未到,再等等就好。");
    expect(check(t, "paid").some((v) => v.rule === "adler-question")).toBe(true);
  });

  it("第三段缺時間尺度", () => {
    const t = swap(2, "務實面的槓桿在於把事情拆小,〔權杖八正位〕顯示動起來之後流速會自己加快,方向是【先動再修】。");
    expect(check(t, "paid").some((v) => v.rule === "timescale")).toBe(true);
  });

  it("一件事塞了多個動作", () => {
    const t = swap(3, "明天挑一個小塊動手做完它,並且把整份計畫重寫一遍,然後再跟主管約時間報告。");
    expect(check(t, "paid").some((v) => v.rule === "one-thing")).toBe(true);
  });

  it("Markdown 條列", () => {
    const t = swap(3, "明天做這件事:\n- 挑一個小塊\n- 動手做完");
    expect(check(t, "paid").some((v) => v.rule === "markdown")).toBe(true);
  });
});

describe("方向二次檢查", () => {
  it("解析分類器輸出", () => {
    expect(parseDirection("+1")).toBe(1);
    expect(parseDirection("0")).toBe(0);
    expect(parseDirection("-1")).toBe(-1);
    expect(parseDirection(" -1 \n")).toBe(-1);
    expect(parseDirection("方向是正的")).toBe(null);
  });

  it("T5 文案被分類成中性 → 未通過(中性化攔截)", async () => {
    const fake = async () => "0";
    expect(await verifyDirection("(某段被降溫的文)", "T5", fake)).toBe(false);
  });

  it("T5 文案分類為 -1 → 通過", async () => {
    const fake = async () => "-1";
    expect(await verifyDirection("(誠實的不利解讀)", "T5", fake)).toBe(true);
  });

  it("分類器答非所問 → 保守未通過", async () => {
    const fake = async () => "這段解讀整體而言…";
    expect(await verifyDirection("(文)", "T4", fake)).toBe(false);
  });

  it("只有 T4/T5 必查", () => {
    expect(needsDirectionCheck("T5")).toBe(true);
    expect(needsDirectionCheck("T4")).toBe(true);
    expect(needsDirectionCheck("T3")).toBe(false);
    expect(needsDirectionCheck("T1")).toBe(false);
  });
});
