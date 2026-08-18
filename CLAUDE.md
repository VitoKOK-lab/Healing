# 喵喵占卜 / Healing 專案工作規則

## 部署:不要自動部署(2026-08-18 店主指示)

**預設做到 commit 為止。不 push、不開 PR、不合併。**

原因:
- `git push` 到任何分支都會觸發 Vercel preview build,不是只有合併進 main 才算部署
- Vercel 免費方案每天有部署次數上限(`api-deployments-free-per-day`,>100 就鎖 24 小時),
  已經被自動部署撞爆兩次,擋住驗收

要部署時店主會明講(「推上去」「可以部署了」「上線」)。沒聽到就停在 commit。

## 專案座標

- 正式站:`healingasmr.vercel.app`(Vercel 專案 `healingasmr`)
- 資料庫:Supabase `eurbjdamxugbzrsdabst`,**與另一個命理 App 共用**——
  那個 App 的表以 `zw_` 開頭,絕對不要動
- 開發分支:`claude/healing-brand-video-platform`

## 生成模型

兩層(免費日抽 / 付費深度)都跟著 `MODEL_PROVIDER` 走,現行 Kimi K2.6。
K2.6 關閉思考模式時 `temperature` 只接受 `0.6`,開啟時只接受 `1`,填錯直接 400。

## 教訓

看到品質數字變差,先查是不是自己的審核規則誤殺,再懷疑模型能力。
(2026-08-17:guards 把牌名的「后」當簡體字攔,害通過率假性掉到五成,
 差點為此把付費層換成貴三倍的模型。)
