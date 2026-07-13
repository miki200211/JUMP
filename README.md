# JUMP 聊天室

部署在 GitHub Pages 上的專門聊天室：即時匿名聊天，支援 Emoji 大貼圖、圖片 / GIF 上傳、訊息超連結，以及在線成員名單。後端為 Google Apps Script Web App，資料存於 Google Drive（Sheets + 圖片資料夾）。

詳細設計見 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 本地開發

```bash
npm run dev   # http-server -p 8080，打開 http://localhost:8080
```

前端直接呼叫 `assets/js/config.js` 裡設定的線上 Apps Script `/exec` URL，本地開發不需要自己起後端。

## 部署

- **前端**：push 到 `main`，GitHub Pages（Source: `main` / root）自動生效。改 JS/CSS 時記得 bump `index.html` 的 `?v=` cache-buster。
- **後端**：`apps-script/` 用 [clasp](https://github.com/google/clasp) 推送，並**更新既有 deployment** 以保持 `/exec` URL 不變：

```bash
cd apps-script
clasp push
clasp deployments
clasp deploy --deploymentId <ID> --description "..."
```

首次升級到 v2（聊天室版）後，在 Apps Script 編輯器執行一次 `migrateSchemaHeaders()` 補上訊息表的新欄位表頭。
