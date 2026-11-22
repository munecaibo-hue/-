# 科博館黃金島闖關（React Vite + Google Sheets）

## 1. 本地啟動

```bash
npm install
cp .env.example .env
npm run dev
```

若 `.env` 中的 `GOOGLE_APP_SCRIPT_URL` 留空，前端會自動切換至**本地展示模式**（內建 8 題科博館展品題庫 + `localStorage` 模擬「黃金島」與「回答」工作表）。

## 2. 環境變數 (`.env`)

`vite.config.ts` 已透過 `envPrefix: ['VITE_', 'GOOGLE_', 'PASS_', 'QUESTION_']` 支援直接使用以下變數名稱（參考 [.env.example](./.env.example)）：

```env
GOOGLE_APP_SCRIPT_URL=https://script.google.com/macros/s/你的部署ID/exec
PASS_THRESHOLD=5
QUESTION_COUNT=8
```

## 3. Google Sheets & Apps Script 設定

1. 開啟目標 Google Sheets → **擴充功能 → Apps Script**。
2. 將 [gas/Code.gs](./gas/Code.gs) 完整貼入 `Code.gs` 並儲存。
3. 執行一次 `initSheetsWithSampleData`（或手動建立以下三張工作表表頭）：
   - **「黃金島」工作表**：`ID | 班級 | 第幾小隊 | 小隊名稱 | 小隊長 | 小隊人數 | 登錄時間`
   - **「題目」工作表**：`題號 | 題目 | A | B | C | D | 解答 | 探險小知識 | 館廳 | 展品`
   - **「回答」工作表**：`ID | 闖關次數 | 總分 | 最高分 | 第一次通關分數 | 花了幾次通關 | 最近遊玩時間`
4. 點選 **部署 → 新增部署作業**（修改既有程式請走 **部署 → 管理部署作業 → 編輯 → 版本選「新版本」→ 部署**）：
   - 類型：**網頁應用程式**
   - 執行身分：**我**
   - 誰可以存取：**所有人**
5. 複製產生的 `/exec` 網址填入 `.env`（本地）與 GitHub Secrets（線上部署）。

## 4. 自動部署至 GitHub Pages（GitHub Actions）

本專案已內建 [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml)，每次推送至 `main`（或 `master`）分支會自動建置並發佈到 GitHub Pages，並自動套用 Repository 子路徑（`/<repo-name>/`），圖片與靜態資源皆不會 404。

### 初次設定步驟

1. **將專案推送至 GitHub Repository**：
   ```bash
   git init
   git add .
   git commit -m "init golden island quiz"
   git branch -M main
   git remote add origin https://github.com/<你的帳號>/<你的Repo名稱>.git
   git push -u origin main
   ```
   > 提醒：`.gitignore` 已排除 `.env`，推上公開 Repo 前建議將 `.env.example` 中的 `GOOGLE_APP_SCRIPT_URL` 改為留空或範例佔位字。

2. **開啟 GitHub Pages（使用 GitHub Actions 來源）**：
   - 進入 GitHub Repository → **Settings** → 左側 **Pages**。
   - **Build and deployment → Source** 選擇 **`GitHub Actions`**。

3. **設定環境變數（對應 `.env.example`）**：
   - 進入 Repository → **Settings → Secrets and variables → Actions**：
     - 在 **Secrets** 分頁新增：
       - `GOOGLE_APP_SCRIPT_URL`：你的 Google Apps Script `/exec` 部署網址
     - 在 **Variables** 分頁新增（未填則自動使用預設值 `5` 與 `8`）：
       - `PASS_THRESHOLD`：`5`
       - `QUESTION_COUNT`：`8`
     - *(註：Workflow 同時相容從 Secrets 或 Variables 讀取上述三個變數。)*

4. **觸發與確認部署**：
   - 設定完後，只要 `git push` 到 `main`，或到 **Actions → Deploy to GitHub Pages → Run workflow** 手動執行一次。
   - 待 `build` 與 `deploy` 兩個階段都變綠燈後，點選 `deploy` 步驟顯示的網址（`https://<你的帳號>.github.io/<你的Repo名稱>/`）即可開啟正式網站。
# -
