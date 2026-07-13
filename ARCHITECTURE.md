# Jump — 系統架構文件

一個部署在 GitHub Pages 上的**專門聊天室**：即時匿名聊天，支援貼圖（Emoji 大貼圖）、圖片與 GIF 上傳、訊息內超連結，以及在線成員名單。後端由 Google Apps Script Web App 提供 API，資料儲存於 Google Drive。

---

## 1. 系統概覽

```
┌──────────────────────────────────────────────┐
│  瀏覽器 (使用者)                                │
│  ┌────────────────────────────────────────┐  │
│  │  GitHub Pages — 靜態前端                 │  │
│  │  index.html / CSS / Vanilla JS          │  │
│  │                                         │  │
│  │  聊天視窗：訊息板 + 輸入列                  │  │
│  │  （表情/貼圖面板、圖片上傳、在線名單）        │  │
│  └────────────────┬───────────────────────┘  │
└───────────────────┼──────────────────────────┘
                    │ fetch (HTTPS)
                    ▼
┌───────────────────────────────┐
│  Google Apps Script Web App   │
│  (/exec)                      │
│                               │
│  doGet(action=messages)       │──→ 讀訊息 + 在線名單
│  doPost(action=send)          │──→ 寫訊息
│  doPost(action=upload)        │──→ 存圖片，回傳公開網址
└───────────────┬───────────────┘
                │ DriveApp / SpreadsheetApp / CacheService
                ▼
┌───────────────────────────────────────┐
│  Google Drive                          │
│  └─ /JumpApp/                          │
│      ├─ messages.gsheet   (訊息紀錄)    │
│      └─ uploads/          (上傳的圖片)  │
└───────────────────────────────────────┘
```

**核心設計原則**：前端完全靜態、無建置步驟；所有動態資料透過單一 Apps Script endpoint 進出；Drive 同時扮演資料庫、圖床與後台管理介面（可直接用 Sheets UI 檢視/刪除訊息、用 Drive UI 刪除圖片）。

---

## 2. 技術選型

| 層級 | 技術 | 選用理由 |
|---|---|---|
| 前端託管 | GitHub Pages | 免費、自動 HTTPS、push 即部署 |
| 前端框架 | 原生 HTML/CSS/JS（無框架） | 無建置流程、GitHub Pages 直接吐檔案 |
| 後端 | Google Apps Script Web App | 免主機、免費、原生存取 Drive |
| 資料儲存 | Google Sheets（訊息）+ Drive 資料夾（圖片） | Sheets 附帶現成的資料檢視介面；Drive 當圖床免申請外部服務 |
| 在線狀態 | CacheService | 免費、TTL 天生符合 presence 語意 |
| 版本控管 | Git + GitHub | — |

前端刻意不使用 React/Vue，因為引入框架就需要 build step 與 CI，對這個規模的專案是純負擔。

---

## 3. 目錄結構

```
jump/
├─ ARCHITECTURE.md            ← 本文件
├─ README.md                  ← 安裝與部署說明
├─ index.html                 ← 唯一頁面（專門聊天室）
│
├─ assets/
│  ├─ css/
│  │  └─ style.css
│  └─ js/
│     ├─ config.js            ← Apps Script URL、輪詢間隔、上傳上限等常數
│     ├─ emoji.js             ← 表情選單與貼圖面板的資料（純資料）
│     ├─ api.js               ← 封裝所有對 Apps Script 的呼叫
│     └─ chat.js              ← 聊天室：輪詢、渲染管線、上傳、在線名單
│
└─ apps-script/               ← 後端原始碼（用 clasp 同步至 Apps Script）
   ├─ appsscript.json         ← 專案設定（時區、權限範圍）
   ├─ Main.gs                 ← doGet / doPost 路由分派
   ├─ Chat.gs                 ← 訊息讀寫 + 圖片上傳
   ├─ Storage.gs              ← Drive / Sheets 存取層
   └─ Utils.gs                ← 回應格式、鎖、速率限制、在線狀態
```

`apps-script/` 目錄的程式碼透過 [clasp](https://github.com/google/clasp) 與線上的 Apps Script 專案同步，讓後端程式碼也能進版控（`.clasp.json` 含 scriptId，僅存在本機、不進版控）。

---

## 4. 資料模型

### 4.1 `messages`（Google Sheets）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | String | UUID，前端產生，用於去重與樂觀更新 |
| `ts` | Number | Unix timestamp（毫秒），伺服器端寫入 |
| `nickname` | String | 顯示名稱，1–20 字元，**存原文** |
| `text` | String | 訊息內容，**存原文**（只去控制字元）；text 1–500、sticker 1–16（emoji 本body）、image 可空 |
| `clientHash` | String | 客戶端指紋，用於速率限制 |
| `type` | String | `text` / `image` / `sticker`；舊資料列此欄為空，讀取時視為 `text` |
| `mediaUrl` | String | 僅 image 型別有值；必須符合上傳網址白名單（見 §7.4） |

> **為什麼存原文**：舊版後端在寫入時就做 HTML entity 轉義，前端渲染時又轉義一次，造成 `A & B` 顯示成 `A &amp; B`、`/` 變成 `&#x2F;`（超連結因此壞掉）。現行原則是「**儲存原文，只在渲染時轉義一次**」；前端對舊資料列會先做 legacy entity 還原再走渲染管線。

### 4.2 `uploads/`（Drive 資料夾）

聊天室上傳的圖片/GIF。檔名由伺服器產生（`img_<ts>.<ext>`），不接受客戶端檔名。每個檔案上傳後設為「知道連結的任何人可檢視」，前端以 `https://lh3.googleusercontent.com/d/<FILE_ID>` 內嵌。

### 4.3 在線狀態（CacheService，非持久化）

鍵 `online_users_list`，值為 JSON：`{ "<fingerprint>": { "n": "<暱稱>", "t": <lastSeenMs> } }`。每次輪詢時蓋章、逐出超過 15 秒未輪詢者。暱稱去重後回傳給前端（上限 50 名），指紋數為在線人數。

---

## 5. API 設計

**Base URL**：`https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`

### 統一回應格式

```json
{ "ok": true,  "data": { ... } }
{ "ok": false, "error": { "code": "RATE_LIMITED", "message": "..." } }
```

### 端點列表

| Method | action | 參數 | 說明 |
|---|---|---|---|
| GET | `messages` | `since`（選填）, `fingerprint`, `nickname` | 取回 `ts > since` 的訊息 + 在線名單；`since` 省略時回最近 50 筆 |
| POST | `send` | `id`, `nickname`, `text`, `type`, `mediaUrl`, `fingerprint` | 新增一則訊息（速率限制 1 則/3 秒） |
| POST | `upload` | `data`（base64）, `mimeType`, `fingerprint` | 存圖片到 Drive，回 `{ fileId, url }`（速率限制 1 次/10 秒） |

### GET `?action=messages&since=...&fingerprint=...&nickname=...`

```json
{
  "ok": true,
  "data": {
    "messages": [
      { "id": "a1b2", "ts": 1720598461234, "nickname": "小明",
        "text": "哈囉 https://example.com", "type": "text", "mediaUrl": "" }
    ],
    "serverTs": 1720598470000,
    "onlineCount": 2,
    "online": { "count": 2, "users": ["小明", "小華"] }
  }
}
```

前端把 `serverTs` 存起來當下一次輪詢的 `since`，避免客戶端時鐘偏移。`onlineCount` 是相容舊前端的欄位，新程式讀 `online`。

### 圖片上傳流程（兩段式）

1. 前端把檔案處理成 base64（見 §6.2）→ `POST action=upload` → 後端驗證 mime 白名單 + magic bytes + 大小上限（4MB）→ 存進 `uploads/`、設公開連結 → 回 `{ url }`。
2. 前端再走一般的 `POST action=send`，`type: 'image'`、`mediaUrl: <url>`。後端以嚴格 regex 驗證 `mediaUrl` 必須是自家上傳網址（`lh3.googleusercontent.com/d/<id>`），客戶端無法把任意網域塞進 image 訊息。

---

## 6. 前端模組

### 6.1 渲染管線（`chat.js`）— 安全性的核心

訊息一律以「**先分段、再逐段轉義**」渲染（先轉義再 linkify 會把網址中的 `&` 弄壞）：

1. `normalizeLegacyEntities()`：還原舊資料的 6 種 entity（`&amp;` 最後解）。
2. 以 `URL_RE = /https?:\/\/[^\s<>"'`]+/g` 切出網址段，並修剪尾端標點。
3. 純文字段 → `escapeHTML()`（轉義 `& < > " '`）。
4. 網址段：
   - `https://` 且路徑結尾為 `.png/.jpg/.jpeg/.gif/.webp` → 內嵌 `<img loading="lazy" referrerpolicy="no-referrer">`，包在可開 lightbox 的連結裡；
   - 其他 → `<a target="_blank" rel="noopener noreferrer">`。
   - `javascript:` 等協定天生不可能出現（regex 錨定 `https?://`）。
5. `type: 'image'` 訊息：`mediaUrl` 需通過與後端相同的 lh3 白名單 regex 才嵌 `<img>`；`type: 'sticker'`：內容轉義後以大字級顯示。
6. 每張 `<img>` 掛 onerror 備援鏈：`lh3` → `drive.google.com/thumbnail?id=<id>&sz=w1600`（會轉靜態圖，故僅當備援）→ 降級為純連結。

**不變量**：所有使用者可控字串在輸出前恰好經過一次 `escapeHTML`；`href`/`src` 只可能是 `https?://` 開頭（內嵌僅限 https）；事件處理器一律用 `addEventListener` 掛，絕不拼進 HTML 字串。

### 6.2 上傳前的圖片處理

- **GIF 絕不重編碼**（canvas 會失去動畫），原檔上傳，上限 4MB。
- JPEG/PNG/WebP：≤1MB 且邊長 ≤1600px 直接上傳原檔（保留 PNG 透明度）；否則 canvas 縮至最長邊 1600px 輸出 JPEG（q=0.85，過大再試 q=0.7，仍超過 4MB 就拒絕）。
- 三個入口共用同一流程：🖼️ 檔案按鈕、剪貼簿貼上、拖放到聊天面板。
- 樂觀 UI：先用 `URL.createObjectURL` 畫出半透明氣泡 + spinner，上傳與送出完成後轉正；失敗標記 `⚠️` 並保留重試提示。

### 6.3 輪詢與退避（沿用原設計）

- `setTimeout` 遞迴輪詢（非 `setInterval`），間隔 5 秒；分頁隱藏（`document.hidden`）時暫停。
- 連續錯誤前 2 次以 2 秒快速重試，之後 ×1.5 指數退避至上限 60 秒。
- 樂觀送出以自產 `id` 去重；`serverTs` 作為增量拉取游標。

### 6.4 表情與貼圖（`emoji.js` + `chat.js`）

`emoji.js` 只放兩個常數陣列：`EMOJI_LIST`（點了插入輸入框游標處）與 `STICKER_LIST`（點了直接以 `type:'sticker'` 送出，前端以約 3.4rem 大字渲染，LINE 貼圖風格）。要擴充貼圖只需要加字串進陣列。

---

## 7. 關鍵技術限制與對策

### 7.1 CORS：POST 必須避開 preflight

Apps Script Web App **無法自訂回應標頭**，因此無法回應 CORS preflight（`OPTIONS`）。所有 POST（包含上傳的大 base64 payload）一律用 `Content-Type: text/plain;charset=utf-8` 送出 JSON 字串，維持「簡單請求」。後端自行 `JSON.parse(e.postData.contents)`。**改動 API 時絕不能破壞這個約定。**

### 7.2 執行時間配額

免費帳號有每日執行時間上限。對策沿用：輪詢間隔 ≥5 秒、增量拉取、分頁隱藏暫停、`doGet` 只讀 Sheets 尾端 range。圖片上傳是低頻操作（1 次/10 秒/人），影響有限。

### 7.3 並發寫入

跨多次 Sheets 呼叫的寫入用 `LockService` 包住（`withLock`）。上傳不碰共享狀態，不需要鎖。

### 7.4 Drive 圖床的網址選擇

- `https://lh3.googleusercontent.com/d/<FILE_ID>`：回傳原始檔案 bytes，**保留 GIF 動畫**，可跨域內嵌 —— 作為主要網址。屬非正式文件化端點，故前端掛 onerror 備援鏈。
- `https://drive.google.com/thumbnail?id=<id>&sz=w1600`：穩定但會重新編碼成**靜態圖**（GIF 動畫消失），只當備援。
- `https://drive.google.com/uc?export=view`：2024 起對外嵌已失效，不使用。
- 權限：檔案由 Apps Script 自建，`drive.file` scope 即足以 `setSharing(ANYONE_WITH_LINK, VIEW)`。若部署後 `setSharing` 拋權限錯誤，改在 `appsscript.json` 加完整 `drive` scope 並重新授權。

### 7.5 沒有 WebSocket

Apps Script 不支援長連線，「即時」的實際延遲是一個輪詢週期（約 5 秒）。需要真即時可將聊天遷移至 Firebase RTDB/Firestore。

---

## 8. 安全性

**前端是完全公開的**，任何字串常數都藏不住。

- `config.js` 只放 Web App 的 `/exec` URL；**絕不**放 API key 或 Drive 檔案 ID。
- Web App 部署為「執行身分：我」+「存取權：任何人」。後端只操作 `/JumpApp/` 內自建的檔案，**絕不接受來自請求參數的檔案 ID 或檔名**（上傳檔名由伺服器產生）。
- **輸入驗證在後端**：暱稱/內容長度、`type` 白名單、`mediaUrl` 網域白名單、上傳 mime 白名單 + magic bytes、大小上限，全部在 Apps Script 端強制。前端驗證只是 UX。
- **XSS**：渲染採「分段轉義」管線（§6.1），儲存原文、輸出時恰好轉義一次；內嵌媒體的 `src` 受 https 與白名單約束。
- **速率限制**：訊息 1 則/3 秒、上傳 1 次/10 秒（`CacheService` 記指紋）。這擋誤觸與洗版，不是真正的身分驗證；需要實名就得導入 Google Sign-In。
- **隱私註記**：訊息中貼第三方圖片網址會由每個觀看者的瀏覽器直接向該站抓圖（已設 `referrerpolicy="no-referrer"`，但對方仍看得到 IP）。上傳到 Drive 的圖片為「知道連結即可看」。

---

## 9. 部署流程

### 後端（Apps Script）

```bash
cd apps-script
clasp login                       # 首次
# 首次抓既有專案：clasp clone <scriptId>（scriptId 見 Apps Script 編輯器「專案設定」）
clasp push                        # 推程式碼
clasp deployments                 # 找出既有的 deployment ID
clasp deploy --deploymentId <ID> --description "v2 chat room"
```

- **必須更新既有 deployment**（或在編輯器「部署 → 管理部署 → 編輯 → 新版本」），`/exec` URL 才不會變，前端 `config.js` 不用改。
- 升級後在編輯器手動執行一次 `migrateSchemaHeaders()`，補上既有 `messages` 表的 `type`/`mediaUrl` 表頭（純標示用，不跑也不影響功能）。
- 部署設定維持：執行身分「我」、存取權「任何人」。

### 前端（GitHub Pages）

Repository → Settings → Pages → Source 選 `main` 分支 `/ (root)`。push 後約 1 分鐘生效。改動 JS/CSS 時記得同步 bump `index.html` 內的 `?v=` cache-buster。

---

## 10. 已知取捨與未來事項

1. **Drive 空間成長**：上傳圖片會一直累積在 `uploads/`。未來可加時間驅動觸發器（如每月）清掉超過 N 天且訊息已被歸檔的圖檔；上傳成功但 send 失敗的孤兒檔目前可接受。
2. **訊息保存期限**：Sheets 單檔有儲存格上限，長期運行需定期歸檔舊訊息。
3. **匿名本質**：暱稱可隨意改、可重複；在線名單只是「最近 15 秒有輪詢的指紋 + 其暱稱」。
4. **貼圖集**：目前是 emoji 大字渲染；若日後要自訂圖片貼圖包，可在 `emoji.js` 擴充為 `{ id, url }` 結構並沿用 image 渲染路徑（記得把貼圖圖檔納入白名單策略）。
