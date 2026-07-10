# Jump — 系統架構文件

一個部署在 GitHub Pages 上的靜態網頁，提供**即時聊天室**與**社群平台跳轉入口**（YouTube / Instagram / Facebook）。後端由 Google Apps Script Web App 提供 API，資料儲存於 Google Drive。

---

## 1. 系統概覽

```
┌──────────────────────────────────────────────┐
│  瀏覽器 (使用者)                                │
│  ┌────────────────────────────────────────┐  │
│  │  GitHub Pages — 靜態前端                 │  │
│  │  index.html / CSS / Vanilla JS          │  │
│  │                                         │  │
│  │  ┌───────────┐      ┌────────────────┐  │  │
│  │  │  聊天室    │      │  跳轉按鈕區      │  │  │
│  │  │  Chat UI  │      │  YT / IG / FB  │  │  │
│  │  └─────┬─────┘      └───────┬────────┘  │  │
│  └────────┼────────────────────┼───────────┘  │
└───────────┼────────────────────┼──────────────┘
            │ fetch (HTTPS)      │ target="_blank"
            │                    │ 開新分頁
            ▼                    ▼
┌───────────────────────┐   ┌──────────────────┐
│  Google Apps Script   │   │  youtube.com     │
│  Web App (/exec)      │   │  instagram.com   │
│                       │   │  facebook.com    │
│  doGet()  → 讀訊息     │   └──────────────────┘
│  doPost() → 寫訊息     │
└───────────┬───────────┘
            │ DriveApp / SpreadsheetApp
            ▼
┌───────────────────────────────────────┐
│  Google Drive                          │
│  └─ /JumpApp/                          │
│      ├─ messages.gsheet   (訊息紀錄)    │
│      ├─ config.json       (跳轉連結設定) │
│      └─ analytics.gsheet  (點擊統計)    │
└───────────────────────────────────────┘
```

**核心設計原則**：前端完全靜態、無建置步驟；所有動態資料透過單一 Apps Script endpoint 進出；Drive 同時扮演資料庫與後台管理介面（可直接用 Google Sheets UI 檢視/修改資料）。

---

## 2. 技術選型

| 層級 | 技術 | 選用理由 |
|---|---|---|
| 前端託管 | GitHub Pages | 免費、自動 HTTPS、push 即部署 |
| 前端框架 | 原生 HTML/CSS/JS（無框架） | 無建置流程、GitHub Pages 直接吐檔案 |
| 後端 | Google Apps Script Web App | 免主機、免費、原生存取 Drive |
| 資料儲存 | Google Drive（Sheets + JSON） | 需求指定；Sheets 附帶現成的資料檢視介面 |
| 版本控管 | Git + GitHub | — |

前端刻意不使用 React/Vue，因為引入框架就需要 build step 與 CI，對這個規模的專案是純負擔。若未來 UI 複雜度上升，可改用 GitHub Actions 建置後推到 `gh-pages` 分支。

---

## 3. 目錄結構

```
jump/
├─ ARCHITECTURE.md            ← 本文件
├─ README.md                  ← 安裝與部署說明
├─ index.html                 ← 唯一頁面（聊天室 + 跳轉區）
│
├─ assets/
│  ├─ css/
│  │  └─ style.css
│  ├─ js/
│  │  ├─ config.js            ← Apps Script URL、輪詢間隔等常數
│  │  ├─ api.js               ← 封裝所有對 Apps Script 的呼叫
│  │  ├─ chat.js              ← 聊天室：輪詢、渲染、送出
│  │  └─ jump.js              ← 跳轉按鈕：渲染、點擊追蹤
│  └─ img/
│     └─ icons/               ← YT / IG / FB 圖示
│
├─ .github/
│  └─ workflows/
│     └─ pages.yml            ← 自動部署到 GitHub Pages
│
└─ apps-script/               ← 後端原始碼（用 clasp 同步至 Apps Script）
   ├─ appsscript.json         ← 專案設定（時區、權限範圍）
   ├─ Main.gs                 ← doGet / doPost 路由分派
   ├─ Chat.gs                 ← 聊天訊息的讀寫邏輯
   ├─ Storage.gs              ← Drive / Sheets 存取層
   ├─ Config.gs               ← 跳轉連結設定的讀取
   └─ Utils.gs                ← 回應格式、鎖、驗證
```

`apps-script/` 目錄的程式碼透過 [clasp](https://github.com/google/clasp) 與線上的 Apps Script 專案雙向同步，讓後端程式碼也能進版控。

---

## 4. 資料模型

所有資料存放於 Drive 的 `/JumpApp/` 資料夾。

### 4.1 `messages`（Google Sheets）

聊天訊息主表。選用 Sheets 而非純 JSON 檔的原因：`appendRow()` 是原子操作、可只讀取指定 range（不必載入整檔）、且能直接在 Sheets UI 檢視與刪除違規訊息。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | String | UUID，前端產生，用於去重與樂觀更新 |
| `ts` | Number | Unix timestamp（毫秒），伺服器端寫入 |
| `nickname` | String | 顯示名稱，1–20 字元 |
| `text` | String | 訊息內容，1–500 字元 |
| `clientHash` | String | 客戶端指紋雜湊，用於速率限制 |

### 4.2 `config.json`（Drive 純文字檔）

跳轉連結設定。改這個檔就能改前端顯示的連結，不必重新部署 GitHub Pages。

```json
{
  "links": [
    {
      "id": "youtube",
      "label": "YouTube 頻道",
      "url": "https://www.youtube.com/@example",
      "appScheme": "vnd.youtube://www.youtube.com/@example",
      "icon": "yt.svg",
      "enabled": true
    },
    {
      "id": "instagram",
      "label": "Instagram",
      "url": "https://www.instagram.com/example",
      "appScheme": "instagram://user?username=example",
      "icon": "ig.svg",
      "enabled": true
    },
    {
      "id": "facebook",
      "label": "Facebook 粉專",
      "url": "https://www.facebook.com/example",
      "appScheme": "fb://page/123456789",
      "icon": "fb.svg",
      "enabled": true
    }
  ]
}
```

### 4.3 `analytics`（Google Sheets）

點擊追蹤。每次跳轉寫入一列：`ts`、`linkId`、`referrer`、`userAgent`。

---

## 5. API 設計

Apps Script Web App 只暴露兩個進入點（`doGet`、`doPost`），內部依 `action` 參數分派。

**Base URL**：`https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`

### 統一回應格式

```json
{ "ok": true,  "data": { ... } }
{ "ok": false, "error": { "code": "RATE_LIMITED", "message": "送太快了" } }
```

### 端點列表

| Method | action | 參數 | 說明 |
|---|---|---|---|
| GET | `messages` | `since` (timestamp, 選填) | 取回 `ts > since` 的訊息；`since` 省略時回傳最近 50 筆 |
| GET | `links` | — | 取回 `config.json` 的跳轉連結設定 |
| POST | `send` | `id`, `nickname`, `text` | 新增一則訊息 |
| POST | `track` | `linkId` | 記錄一次跳轉點擊 |

### GET `?action=messages&since=1720598400000`

```json
{
  "ok": true,
  "data": {
    "messages": [
      { "id": "a1b2...", "ts": 1720598461234, "nickname": "小明", "text": "哈囉" }
    ],
    "serverTs": 1720598470000
  }
}
```

前端把回應中的 `serverTs` 存起來，當作下一次輪詢的 `since`，避免因客戶端時鐘偏移而漏訊息或重複拉取。

---

## 6. 前端模組

### 6.1 `chat.js` — 聊天室

- **輪詢**：以 `setTimeout` 遞迴（非 `setInterval`）呼叫 `GET ?action=messages&since=<lastServerTs>`，避免請求堆疊。
- **退避策略**：分頁在前景且近期有活動時間隔 5 秒；分頁隱藏（`document.hidden`）時暫停輪詢；連續錯誤時指數退避至上限 60 秒。
- **樂觀更新**：送出時前端立即以自產的 `id` 把訊息畫上去（灰色/半透明），伺服器回應後轉為已送達；輪詢拉回的訊息以 `id` 去重。
- **暱稱**：存於 `localStorage`，首次進站要求輸入。

### 6.2 `jump.js` — 跳轉區

從 `GET ?action=links` 讀設定，動態渲染按鈕。

跳轉一律使用真實的 `<a>` 標籤：

```html
<a href="https://www.youtube.com/@example"
   target="_blank"
   rel="noopener noreferrer">YouTube</a>
```

**不要**使用 `window.open()`。瀏覽器只允許在使用者手勢（click）的同步呼叫堆疊中開新分頁；一旦 `window.open()` 出現在 `await` 之後或 `fetch().then()` 的 callback 裡，就會被彈出視窗攔截器擋掉。

**點擊追蹤不能阻塞跳轉**。用 `navigator.sendBeacon()` 在背景送出，它不等待回應、不影響導航：

```js
link.addEventListener('click', () => {
  navigator.sendBeacon(
    `${API_BASE}?action=track`,
    new Blob([JSON.stringify({ linkId })], { type: 'text/plain' })
  );
  // 不 preventDefault()，讓 <a> 正常開新分頁
});
```

`rel="noopener"` 是必要的：沒有它，被開啟的分頁可以透過 `window.opener` 操作本頁（反向 tabnabbing）。

---

## 7. 關鍵技術限制與對策

這一節是本專案最容易踩坑的地方，實作前務必閱讀。

### 7.1 CORS：POST 必須避開 preflight

Apps Script Web App **無法自訂回應標頭**，因此無法正確回應 CORS preflight（`OPTIONS`）請求。若前端用 `Content-Type: application/json` 發 POST，瀏覽器會先送 preflight，然後失敗。

**對策**：把 POST 送成「簡單請求」（simple request）——使用 `text/plain` 作為 Content-Type，body 仍放 JSON 字串，由 Apps Script 端自行 `JSON.parse(e.postData.contents)`。

```js
// 前端
await fetch(API_BASE, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // 關鍵
  body: JSON.stringify({ action: 'send', nickname, text }),
});
```

```js
// Apps Script — Main.gs
function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  // ...
}
```

GET 請求不受影響（Apps Script 的 `/exec` 會 302 導向 `googleusercontent.com` 回傳內容，可正常跨域讀取）。

### 7.2 執行時間配額

Apps Script 對免費 Google 帳號有每日總執行時間上限（依官方文件為準，量級約在數十分鐘至數小時），單次執行也有時限。

一個每 3 秒輪詢一次的聊天室，單一使用者一天就會發出約 28,800 次請求——會很快撞到配額。

**對策**：
1. 輪詢間隔不低於 5 秒，且必須實作增量拉取（`since`）與分頁隱藏時暫停。
2. `doGet` 只讀取 Sheets 的尾端 range，不要 `getDataRange()` 掃全表。
3. 把 `config.json`（跳轉連結）快取在 `CacheService` 與前端 `localStorage`，這份資料幾乎不變。
4. 部署前用 Apps Script 主控台的「執行項目」頁面觀察實際耗時。

> **待驗證**：正式配額數字請以 [Apps Script Quotas](https://developers.google.com/apps-script/guides/services/quotas) 官方頁面為準，不要依賴本文件的估計值。

### 7.3 並發寫入

多人同時送訊息時，`appendRow()` 本身是原子的，但「讀取最後一列 → 計算 → 寫入」這類 read-modify-write 序列不是。任何跨多次 Sheets 呼叫的寫入邏輯都必須用 `LockService` 包起來：

```js
function withLock(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('LOCK_TIMEOUT');
  try { return fn(); } finally { lock.releaseLock(); }
}
```

### 7.4 沒有 WebSocket

Apps Script 不支援長連線，聊天室只能靠輪詢。這是本架構的硬限制，「即時」的實際延遲是一個輪詢週期（約 5 秒）。

若日後需要真正的即時性，替代路線是把 Chat 部分遷移到 Firebase Realtime Database 或 Firestore（前端可直連，仍不需要自架主機），而把 Apps Script 保留給 Drive 相關的操作。

---

## 8. 安全性

**前端是完全公開的**。GitHub Pages 上的任何 JS 檔案、任何字串常數，使用者都能直接讀取。

- **絕不**在前端放任何 API key、Drive 檔案 ID 或密鑰。`config.js` 只能放 Web App 的 `/exec` URL（這個 URL 本身不是秘密，但也不是防護）。
- Web App 部署設定為「執行身分：我」+「存取權：任何人」。這代表**任何知道 URL 的人都能呼叫你的 endpoint**，且是以你的 Google 帳號權限在執行。因此 `Storage.gs` 只能存取 `/JumpApp/` 資料夾內的檔案，絕不接受來自請求參數的檔案 ID。
- **輸入驗證在後端**：`nickname` 與 `text` 的長度、字元、內容檢查一律在 Apps Script 端做。前端驗證只是 UX，不是安全邊界。
- **XSS**：渲染訊息時用 `textContent`，絕不用 `innerHTML` 拼接使用者輸入。
- **速率限制**：以 `CacheService` 記錄客戶端指紋的送出時間，限制每 3 秒最多一則訊息。這擋得住誤觸與腳本新手，擋不住有心人——如果聊天室需要真正的身分驗證，就得改用 Google Sign-In（前端取得 ID token，後端用 `OAuth2` 驗證）。

---

## 9. 部署流程

### 後端（Apps Script）

```bash
cd apps-script
clasp login
clasp create --type webapp --title "Jump Backend"
clasp push
clasp deploy --description "v1"
```

在 Apps Script 主控台設定「部署 → 新增部署作業 → 網頁應用程式」：
- 執行身分：**我**
- 具有應用程式存取權的使用者：**任何人**

取得 `/exec` URL，填入 `assets/js/config.js`。

> 每次 `clasp push` 之後必須**建立新版本部署**，`/exec` 才會拿到新程式碼。若沿用同一個 deployment ID 並選「新版本」，前端 URL 不需更動。

### 前端（GitHub Pages）

Repository → Settings → Pages → Source 選 `main` 分支 `/ (root)`。push 後約 1 分鐘生效。

`.github/workflows/pages.yml` 目前只做基本的部署；由於沒有 build step，也可以完全不用 workflow，直接讓 Pages 服務讀取分支內容。

---

## 10. 開發階段規劃

| 階段 | 內容 | 驗收標準 |
|---|---|---|
| M1 | Apps Script 骨架：`doGet`/`doPost` 路由、統一回應格式、Drive 資料夾初始化 | 用 `curl` 打 `?action=links` 拿到 JSON |
| M2 | 前端跳轉區：讀 `config.json`、渲染按鈕、新分頁開啟 | 手機與桌機皆能正確開啟三個平台 |
| M3 | 聊天室讀取：`?action=messages` + 輪詢 + 渲染 | 手動在 Sheets 加一列，5 秒內出現在頁面 |
| M4 | 聊天室寫入：`send` + 樂觀更新 + 後端驗證 | 兩個瀏覽器分頁互相看得到訊息 |
| M5 | 點擊追蹤、速率限制、錯誤處理、退避策略 | 關掉網路後前端不噴錯、恢復後自動重連 |

---

## 11. 待確認事項

1. **聊天室是否需要身分驗證**？目前設計為匿名 + `localStorage` 暱稱。若需要實名或防洗版，必須導入 Google Sign-In。
2. **訊息保存期限**？Sheets 單檔有儲存格數量上限，長期運行需要定期歸檔（可用 Apps Script 的時間驅動觸發器每月搬移舊訊息到新檔案）。
3. **既有的 Apps Script 專案**：本文件假設從零建立。若要沿用你現有的專案，需要先確認它目前的 `doGet`/`doPost` 是否已被佔用，以及既有的權限範圍（scopes）。
4. **Facebook 深層連結**的 `fb://page/<id>` 需要數字型的 Page ID，不是自訂網址名稱，要另外查。
