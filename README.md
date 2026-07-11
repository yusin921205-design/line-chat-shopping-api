# LINE Official Account 聊天室購物系統

純 LINE Messaging API 後端；沒有 LIFF、沒有外部結帳頁。所有按鈕都是 Postback，商品、購物車與訂單以 Google Sheets 保存。

## 專案結構

```text
line-shop-api/
├── controllers/        # LINE webhook 與 Postback 流程
├── services/           # 商品、購物車、訂單、session 商業邏輯
├── sheet/              # Google Sheets CRUD
├── flex/templates/     # 分離的 Flex JSON 範本
├── line/               # Messaging API client
├── routes/             # Express routes
└── scripts/            # Rich Menu 建立工具
```

## Google Sheet 設定

1. 建立一份 Google Sheet，複製網址中的 Spreadsheet ID。
2. 在 Google Cloud 啟用 **Google Sheets API**，建立 Service Account 金鑰。
3. 將試算表共用給 service account 的 `client_email`（編輯者）。
4. 設定 `.env`（由 `.env.example` 複製）。可將完整 service account JSON 壓成單行，填入 `GOOGLE_SERVICE_ACCOUNT_JSON`；部署平台建議使用這個方式。
5. 第一次 LINE webhook 呼叫會自動建立三個工作表與標頭：`Products`、`Cart`、`Orders`。

在 `Products` 新增資料，例如：

| ProductId | Name | Price | Image | Description | Stock | Category |
| --- | --- | ---: | --- | --- | ---: | --- |
| SH001 | 草本洗髮精 | 490 | https://example.com/shampoo.jpg | 溫和清潔頭皮 | 30 | 洗髮精 |

`Image` 必須是 LINE 可存取的公開 HTTPS 圖片 URL。

## LINE Developers 設定

1. 建立 Messaging API channel，複製 Channel secret 與 Channel access token 至 `.env`。
2. 部署後，將 Webhook URL 設為 `https://<網域>/webhook`，開啟 **Use webhook**。
3. 確認 webhook 後可在聊天室輸入「商品」測試。

## 本機執行與部署

```bash
cd line-shop-api
npm install
copy .env.example .env
npm run dev
```

Render：將此 repo 推到 Git provider 後建立 Blueprint，或新增 Web Service，Root Directory 設為 `line-shop-api`，並填入四個必要環境變數。`render.yaml` 與 `Dockerfile` 均已提供；Railway 和 Cloud Run 可直接用 Dockerfile 部署。

## Rich Menu

製作一張 **2500 × 843 PNG**，左半部標示「商品分類」、右半部標示「購物車」，儲存為 `assets/rich-menu.png`，然後執行：

```bash
npm run richmenu:create -- assets/rich-menu.png
```

此命令會上傳圖片、建立 `rich-menu.json` 定義的區域，並設定成預設 Rich Menu。左側送出 `action=category`，右側送出 `action=cart`。

## Postback 流程

`add → Cart upsert → 最新購物車`；`plus / minus / delete → Cart update → 最新購物車`；`shipping → payment → checkout → Orders append + Cart clear`。金額每次由 Products 的當前價格與 Cart 數量重新計算，不信任前端金額。

> Session 目前為記憶體型，保存使用者已選擇的物流和付款方式；購物車本身永續保存於 Google Sheet。若 Render/Railway 使用多個 instance，請將此 session 改成 Redis，或把 Shipping、Payment 暫存於另一張 Sheet。
