// 牌陣定義:伺服器是唯一權威(前端只送 spread id)。
// positions 的語意沿用原 /api/tarot/reading 的表;weight 是 tier 計算用的位置權重——
// 「結局/走向」類位置比「過去/根源」類更能決定整體吉凶。

export type Position = { label: string; hint: string; weight: number };
export type Spread = { id: string; name: string; positions: Position[] };

export const SPREADS: Record<string, Spread> = {
  single: {
    id: "single",
    name: "核心指引",
    positions: [{ label: "核心指引", hint: "此刻最需要知道的一件事", weight: 1 }],
  },
  flow: {
    id: "flow",
    name: "時間之流",
    positions: [
      { label: "過去", hint: "事情的根源,已經造成的影響", weight: 0.8 },
      { label: "現在", hint: "當前的狀況與正在發展的能量", weight: 1 },
      { label: "未來", hint: "接下來一到三個月的走向", weight: 1.4 },
    ],
  },
  choice: {
    id: "choice",
    name: "二擇一",
    positions: [
      { label: "現況", hint: "你此刻整體的處境", weight: 1 },
      { label: "選 A 的過程", hint: "走 A 這條路會遇到什麼", weight: 1 },
      { label: "選 B 的過程", hint: "走 B 這條路會遇到什麼", weight: 1 },
      { label: "選 A 的結果", hint: "A 最後會走到哪裡", weight: 1.4 },
      { label: "選 B 的結果", hint: "B 最後會走到哪裡", weight: 1.4 },
    ],
  },
  relation: {
    id: "relation",
    name: "關係十字",
    positions: [
      { label: "你的心", hint: "你在這段關係裡的心態與期待", weight: 1 },
      { label: "對方的心", hint: "對方目前的想法或狀態", weight: 1 },
      { label: "橫在中間的", hint: "關係裡的障礙或挑戰", weight: 1 },
      { label: "關係的根", hint: "你們之間真正的基礎", weight: 0.9 },
      { label: "往下走的樣子", hint: "這段關係的發展展望", weight: 1.4 },
    ],
  },
  celtic: {
    id: "celtic",
    name: "賽爾特十字",
    positions: [
      { label: "現況", hint: "事情此刻的核心", weight: 1 },
      { label: "橫跨的挑戰", hint: "正面擋著你的那股力量", weight: 1 },
      { label: "根源", hint: "潛意識裡的基礎,你沒說出口的部分", weight: 0.9 },
      { label: "剛過去的", hint: "正在退場、但影響還在的事", weight: 0.7 },
      { label: "心裡想的", hint: "你意識到的目標或期待", weight: 0.9 },
      { label: "快來的", hint: "短期內就要發生的變化", weight: 1.2 },
      { label: "你自己", hint: "你在這件事裡的姿態", weight: 1 },
      { label: "周圍的人事", hint: "環境與他人帶來的影響", weight: 0.9 },
      { label: "希望與恐懼", hint: "你既期待又害怕的那件事", weight: 0.9 },
      { label: "最後落點", hint: "這條路走下去的終點", weight: 1.5 },
    ],
  },
  tree: {
    id: "tree",
    name: "生命之樹",
    positions: [
      { label: "王冠", hint: "這件事對你最高的意義與目的", weight: 1 },
      { label: "智慧", hint: "推動你的那股原始衝動", weight: 0.9 },
      { label: "理解", hint: "你對它的認識與既有框架", weight: 0.9 },
      { label: "慈悲", hint: "你願意付出、想擴張的部分", weight: 0.9 },
      { label: "嚴厲", hint: "你需要節制或切斷的部分", weight: 0.9 },
      { label: "美", hint: "整件事的核心平衡點", weight: 1.2 },
      { label: "勝利", hint: "你的熱情與人際能量", weight: 0.9 },
      { label: "榮耀", hint: "你的理性與溝通方式", weight: 0.9 },
      { label: "基礎", hint: "潛意識與日常習慣", weight: 1 },
      { label: "王國", hint: "落實到現實生活裡的樣子", weight: 1.3 },
      { label: "總結", hint: "整棵樹合起來要告訴你的事", weight: 1.5 },
    ],
  },
};

export function spreadOf(id: string | undefined | null): Spread {
  return (id && SPREADS[id]) || SPREADS.flow;
}
