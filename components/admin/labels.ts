// 後台共用標籤(純常數,server/client 皆可 import)。

export const ORDER_KIND_LABEL: Record<string, string> = {
  PURCHASE: "課程購買",
  GIFT: "禮物",
  SUBSCRIPTION_INIT: "訂閱",
};

export const VIDEO_STATUS_LABEL: Record<string, string> = {
  UPLOADING: "上傳中",
  PROCESSING: "轉檔中",
  READY: "可播放",
  ERROR: "轉檔失敗",
};

export const ENTITLEMENT_KIND_LABEL: Record<string, string> = {
  PURCHASE: "購買",
  GIFT: "禮物",
};
