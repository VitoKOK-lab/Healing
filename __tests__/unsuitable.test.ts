import { describe, it, expect } from "vitest";
import { unsuitable } from "@/lib/tarot/unsuitable";

// 這一支是安全網的安全網:unsuitable 是唯一擋在「客人問危險題目」與
// 「模型自由發揮」之間的東西。regex 被改壞不會有任何執行期錯誤,
// 只會安靜地放行——所以每一類都要有正例,而且 crisis 類要驗到文案。

describe("危機題目(crisis)", () => {
  const CASES = ["我想自殺", "我不想活了", "覺得活不下去", "想結束生命", "想傷害自己", "最近會自殘"];
  it.each(CASES)("攔下「%s」", (q) => {
    expect(unsuitable(q)?.kind).toBe("crisis");
  });

  it("crisis 的回應一定要給 1925 安心專線,而且不能推銷任何東西", () => {
    const r = unsuitable("我想自殺");
    const text = r!.lines.join("");
    expect(text).toContain("1925");
    expect(text).not.toMatch(/加深|付費|升級|元/);
  });

  it("crisis 排在所有規則最前面:同時提到別類也還是走 crisis", () => {
    expect(unsuitable("我生病了不想活了")?.kind).toBe("crisis");
  });
});

describe("其他不適合的類別", () => {
  const CASES: Array<[string, string]> = [
    ["我這個腫瘤會不會好起來", "health"],
    ["下禮拜要開刀會順利嗎", "health"],
    ["台積電會漲嗎", "money"],
    ["這期樂透買哪一支", "money"],
    ["我阿嬤還能活多久", "death"],
    ["他什麼時候死", "death"],
    ["這次選舉哪一黨會贏", "world"],
    ["台海會不會開戰", "world"],
    ["他什麼時候會跟我告白", "when"],
    ["我明年運勢如何", "toofar"],
    ["這輩子會不會結婚", "toofar"],
    ["他是不是外遇了", "privacy"],
    ["我想偷看他的手機", "privacy"],
  ];
  it.each(CASES)("「%s」判成 %s", (q, kind) => {
    expect(unsuitable(q)?.kind).toBe(kind);
  });

  it("每一類都要有回應文案,不能是空的", () => {
    for (const [q] of CASES) {
      const r = unsuitable(q);
      expect(r!.lines.length).toBeGreaterThan(0);
      expect(r!.lines.every((l) => l.trim().length > 0)).toBe(true);
    }
  });
});

describe("正常題目不能被誤攔", () => {
  const OK = [
    "我跟他的關係接下來會怎麼發展",
    "這份工作我該不該接",
    "最近很焦慮,想看看自己卡在哪",
    "要不要跟主管提加薪",
    "我想搬家,現在是好時機嗎",
    "接下來三個月我該把力氣放在哪",
  ];
  it.each(OK)("放行「%s」", (q) => {
    expect(unsuitable(q)).toBeNull();
  });
});

describe("空值", () => {
  it.each([null, undefined, "", "   "])("%s 不算不適合", (v) => {
    // 空字串直接回 null;只有空白的字串也不該命中任何規則
    expect(unsuitable(v as string | null | undefined)).toBeNull();
  });
});
