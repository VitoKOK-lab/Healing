import { describe, expect, it } from "vitest";
import { buildPrompt, fallbackText, generateReading, type GenerateInput } from "@/lib/tarot/generate";
import { unsuitable } from "@/lib/tarot/unsuitable";
import type { Drawn } from "@/lib/tarot/draw";

const card = (n: number, name: string, orientation: "upright" | "reversed", position: string): Drawn => ({
  n,
  name,
  keyword: "測試關鍵字",
  position,
  positionHint: "測試位置",
  orientation,
  meaning: "測試牌義",
  major: n < 22,
});

const flowCards = [
  card(57, "寶劍八", "reversed", "過去"),
  card(70, "錢幣七", "upright", "現在"),
  card(29, "權杖八", "upright", "未來"),
];

const T5_INPUT: GenerateInput = {
  level: "deep",
  cards: flowCards,
  spreadId: "flow",
  tier: "T5",
  topic: "感情",
  question: "這段關係還走得下去嗎",
};

// 一段會通過付費層 guards 的四段式(借用 guards.test 的合格結構)
const GOOD = `這副牌的方向不樂觀:〔寶劍八逆位〕顯示你早就知道被綁住的是什麼,而〔錢幣七正位〕說目前的等待不會換來你要的結果。整體是【往下走的能量】,誠實面對比硬撐重要。

往內看一層,你在等的其實不是他改變,而是一個「可以不用自己做決定」的理由。〔權杖八正位〕的流速指向的是你自己的生活,不是這段關係。如果把「不想當壞人」這個前提拿掉,你還會留下嗎?

務實面現在只有一個槓桿:界線。這週先把你不能再接受的事情寫下來,三個月內以它為底線行動;有界線,關係的走向才會清楚。方向是【先立界線再談去留】。

明天把那條底線用一句話寫下來,貼在你看得到的地方。`;

describe("生成管線", () => {
  it("合格文案一次過:不重試、不降級", async () => {
    let calls = 0;
    const result = await generateReading(T5_INPUT, {
      call: async () => {
        calls++;
        return GOOD;
      },
      classify: async () => "-1",
    });
    expect(result.fallback).toBe(false);
    expect(result.text).toBe(GOOD);
    expect(calls).toBe(1);
  });

  it("guards 不合格 → 換角度重試", async () => {
    const prompts: string[] = [];
    const result = await generateReading(T5_INPUT, {
      call: async (prompt) => {
        prompts.push(prompt);
        return prompts.length === 1 ? "太短" : GOOD;
      },
      classify: async () => "-1",
    });
    expect(result.fallback).toBe(false);
    expect(result.attempts).toBe(2);
    expect(prompts[0]).not.toBe(prompts[1]); // 換了切入角度
  });

  it("T5 被中性化 → 打回重生成;全滅走降級文案", async () => {
    const result = await generateReading(T5_INPUT, {
      call: async () => GOOD,
      classify: async () => "0", // 分類器判定被中性化
    });
    expect(result.fallback).toBe(true);
    expect(result.attempts).toBe(3);
    expect(result.text).toContain("本喵");
  });

  it("T1 不需要方向二次檢查", async () => {
    let classified = 0;
    const result = await generateReading(
      { ...T5_INPUT, tier: "T1" },
      {
        call: async () => GOOD,
        classify: async () => {
          classified++;
          return "+1";
        },
      }
    );
    expect(result.fallback).toBe(false);
    expect(classified).toBe(0);
  });

  it("API 全掛 → 降級文案,不丟例外", async () => {
    const result = await generateReading(T5_INPUT, {
      call: async () => {
        throw new Error("api down");
      },
      classify: async () => "-1",
    });
    expect(result.fallback).toBe(true);
    expect(result.text.length).toBeGreaterThan(30);
  });
});

describe("去識別化(規格 §5):prompt 內不得出現身分資訊", () => {
  it("GenerateInput 型別層就沒有 userId/暱稱欄位;prompt 內容只含牌面與問題", () => {
    const paid = buildPrompt(T5_INPUT, 0);
    const daily = buildPrompt({ ...T5_INPUT, level: "daily", cards: [flowCards[0]] }, 0);
    for (const p of [paid, daily]) {
      expect(p).not.toMatch(/userId|lineUserId|displayName|U[0-9a-f]{32}/);
    }
    // 該有的內容在
    expect(paid).toContain("寶劍八");
    expect(paid).toContain("這段關係還走得下去嗎");
  });

  it("付費 prompt 含方向鎖定與立場規則", () => {
    const p = buildPrompt(T5_INPUT, 0);
    expect(p).toContain("方向已由系統依牌面計算鎖定");
    expect(p).toContain("明確不利");
    expect(p).toContain("僅供參考");
  });
});

describe("降級文案", () => {
  it("含牌名與溫柔的說法,可直接出貨", () => {
    const text = fallbackText(T5_INPUT);
    expect(text).toContain("寶劍八");
    expect(text).toContain("本喵");
  });
});

describe("不適合題目攔截(伺服器端)", () => {
  it("危機類命中並附 1925 專線", () => {
    const hit = unsuitable("我最近覺得活不下去");
    expect(hit?.kind).toBe("crisis");
    expect(hit?.lines.join("")).toContain("1925");
  });

  it("明牌、確切時間、太遠的未來都攔", () => {
    expect(unsuitable("台積電會漲嗎")?.kind).toBe("money");
    expect(unsuitable("我什麼時候才會遇到對的人")?.kind).toBe("when");
    expect(unsuitable("我五年後會結婚嗎")?.kind).toBe("toofar");
  });

  it("正常問題放行", () => {
    expect(unsuitable("這段關係接下來會怎麼走")).toBe(null);
    expect(unsuitable("")).toBe(null);
  });
});
