// 品牌設定集中於此:要改品牌名/標語/Logo,改這一個檔(加上換掉 public/brand/ 圖檔)即可全站生效。
export const brand = {
  /** 中文品牌名(依店主提供的 App 封面) */
  name: "解憂商店",
  /** 拉丁字標(wordmark,依店主提供的 Banner) */
  nameEn: "Jessica",
  /** 完整署名 */
  fullName: "Jessica 解憂商店",
  tagline: "把煩惱留在門外,把好運帶回家",
  taglineEn: "Leave your worries at the door.",
  description:
    "解憂商店線上療癒學院——舒壓與補運課程影音平台,隨時隨地,為自己留一段安放心情的時光。",
  contactEmail: "hello@jieyou.example",
  /** 店主的 LINE 官方帳號連結(上線前更新) */
  lineOfficialUrl: "#",
  /** App 封面主視覺(直式,行動版) */
  coverImage: "/brand/app-cover.jpeg",
  /** 首頁橫幅(橫式,桌面版) */
  bannerImage: "/brand/banner-desktop.jpeg",
} as const;
