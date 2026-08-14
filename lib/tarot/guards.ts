// 產出審核(規格 §4.1):不靠 prompt 自律,生成後逐條機械檢查。
// 不合格 → 呼叫端重生成一次;仍不合格走降級方案,不出爛文案收錢。
//
// 這裡只放「機械可判」的規則;「定調段第一句就有方向」屬語意判斷,
// 由 direction.ts 的二次分類覆蓋(T4/T5 全查)。

export type Level = "free" | "paid";

export type Violation = { rule: string; detail: string };

// 罐頭句/政策降溫套話:出現即失敗。這些話對誰都成立=什麼都沒說,
// 而「僅供娛樂/不能預測未來」是模型自我否定占卜,直接摧毀付費理由。
const FILLER: Array<[string, RegExp]> = [
  ["僅供參考", /僅供參考/],
  ["僅供娛樂", /僅供娛樂/],
  ["不能預測未來", /(不能|無法)預測未來/],
  ["不構成建議", /不構成任何?建議/],
  ["雙方共同努力", /(感情|關係)?需要雙方共同努力/],
  ["建議理性看待", /理性看待/],
  ["要相信自己", /相信(自己|直覺)/],
  ["答案在你心裡", /答案(就)?在你(的)?心(裡|中)/],
  ["緣分自有安排", /緣分自有安排/],
  ["順其自然", /順其自然/],
  ["每個人都值得被愛", /每個人都值得被愛/],
  ["放下執念", /放下執念/],
  ["學會愛自己", /(學會|好好)愛(惜)?自己/],
  ["時間會給你答案", /時間會(給你|證明)/],
  ["科學角度", /科學(的)?角度/],
  ["心理暗示", /心理暗示/],
  ["不要迷信", /(不要|別)迷信/],
  ["保持開放的心", /保持(開放|平常)的?心/],
  ["沒有絕對好壞", /沒有(絕對的?)?(好|對)(與|和|跟)?(壞|錯)/],
  // 店主實測抓到的罐頭開場:每篇結尾都「明天起床,你可以⋯」
  ["明天起床罐頭開場", /明天(起床|一早|睜開眼)/],
];

// 方法論的名字不能漏出來(規格 §3.2)
const FORBIDDEN_NAMES = /阿德勒|納瓦爾|心理學/;

// 逐張報牌:牌要讀成一個整體
const PER_CARD = /第[一二三四五1-5]張|最後一張牌|中間那張/;

// 付費層禁語尾助詞(收斂專業型)。免費層的本喵可以喵。
const TAIL_PARTICLES = /[喵呢喔唷啦嘛哦捏]["』」]?[。!?!?\n]/;

// 全形彎引號禁用(要用「」『』)
const CURLY_QUOTES = /[“”‘’]/;

// emoji(基本平面外的表情符號 + 常見符號區)
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

// Markdown 符號開頭(禁條列、標題、粗體)
const MARKDOWN = /^[#*\-•]|\n[#*\-•]|\d+\.\s|\*\*/;

// 常見簡體字抽查(繁體文本裡出現任一即失敗)
const SIMPLIFIED_CORE = /[们说对时问题过还这为发现经体后让爱开业动战无点见议乐观极风头脑虑虽听]/;

// 大陸用語攔截(Kimi 增補篇 §2):跑大陸模型時必備;對 Claude 也順便當保險。
// 只收「在台灣塔羅文案裡幾乎不可能正當出現」的高信度詞——
// 台灣也常用的(交往對象、考試通過、比賽項目)刻意不攔,避免誤殺。
const CN_TERMS: Array<[string, RegExp]> = [
  ["信息", /信息/],
  ["視頻", /視頻/],
  ["網絡", /網絡/],
  ["屏幕", /屏幕/],
  ["默認", /默認/],
  ["激活", /激活/],
  ["渠道", /渠道/],
  ["反饋", /反饋/],
  ["靠譜", /靠譜/],
  ["走心", /走心/],
  ["閨蜜", /閨蜜/],
  ["拉黑", /拉黑/],
  ["朋友圈", /朋友圈/],
  ["聊天記錄", /聊天記錄/],
  ["微信", /微信/],
  ["相親", /相親/],
  ["心累", /心累/],
  ["破防", /破防/],
  ["小哥哥/小姐姐", /小哥哥|小姐姐/],
  ["處對象", /[處談找]對象/], // 「交往對象」是正常台灣用法,不攔
  ["挺+形容詞", /挺(好|不錯|難|累|棒|重要)/],
  ["一會兒", /一會兒/],
  ["咋/啥", /[咋啥]/],
];

function checkFiller(text: string): Violation[] {
  return FILLER.filter(([, re]) => re.test(text)).map(([name]) => ({
    rule: "filler",
    detail: name,
  }));
}

// 「一件事」段:只有一個動作。機械近似:不得出現並列連詞串多個指令。
const MULTI_ACTION = /並且|以及|同時也|然後再|,再[去把]/;

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function check(text: string, level: Level): Violation[] {
  const v: Violation[] = [];
  const t = text.trim();

  if (!t || t.length < 40) v.push({ rule: "length", detail: `太短(${t.length} 字)` });

  v.push(...checkFiller(t));

  if (FORBIDDEN_NAMES.test(t)) v.push({ rule: "names", detail: "出現阿德勒/納瓦爾/心理學" });
  if (PER_CARD.test(t)) v.push({ rule: "per-card", detail: "逐張報牌句型" });
  if (CURLY_QUOTES.test(t)) v.push({ rule: "quotes", detail: "使用彎引號而非「」" });
  if (EMOJI.test(t)) v.push({ rule: "emoji", detail: "出現表情符號" });
  if (MARKDOWN.test(t)) v.push({ rule: "markdown", detail: "出現條列/標題/粗體符號" });
  if (SIMPLIFIED_CORE.test(t)) v.push({ rule: "simplified", detail: "出現簡體字" });
  for (const [name, re] of CN_TERMS) {
    if (re.test(t)) v.push({ rule: "cn-term", detail: name });
  }

  if (level === "paid") {
    if (TAIL_PARTICLES.test(t)) v.push({ rule: "tail-particle", detail: "付費層出現語尾助詞" });

    const paras = splitParagraphs(t);
    if (paras.length !== 4) {
      v.push({ rule: "structure", detail: `四段式應為 4 段,實得 ${paras.length} 段` });
    } else {
      const oneThing = paras[3];
      if (MULTI_ACTION.test(oneThing)) {
        v.push({ rule: "one-thing", detail: "「一件事」段出現多個動作" });
      }
      // 心理視角段以問句收束
      if (!/[?？]["』」]?\s*$/.test(paras[1])) {
        v.push({ rule: "adler-question", detail: "第二段未以問句收束" });
      }
      // 務實建議段要有具體時間尺度
      if (!/(今天|明天|這週|本週|這個月|本月|三個月|一個月|兩週|下週|[一二三四五六七八九十\d]+\s*(天|週|个?月)|週[一二三四五六日末])/.test(paras[2])) {
        v.push({ rule: "timescale", detail: "第三段缺具體時間尺度" });
      }
    }
  }

  return v;
}

export function passes(text: string, level: Level): boolean {
  return check(text, level).length === 0;
}
