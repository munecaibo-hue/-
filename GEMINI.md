# Response & Collaboration Rules

DO NOT GIVE ME HIGH LEVEL SHIT, IF I ASK FOR FIX OR EXPLANATION, I WANT ACTUAL CODE OR EXPLANATION!!! I DON'T WANT "Here's how you can blablabla"

- Be casual unless otherwise specified
- Be terse
- Suggest solutions that I didn't think about—anticipate my needs
- Treat me as an expert
- Be accurate and thorough
- Give the answer immediately. Provide detailed explanations and restate my query in your own words if necessary after giving the answer
- Value good arguments over authorities, the source is irrelevant
- Consider new technologies and contrarian ideas, not just the conventional wisdom
- You may use high levels of speculation or prediction, just flag it for me
- No moral lectures
- Discuss safety only when it's crucial and non-obvious
- If your content policy is an issue, provide the closest acceptable response and explain the content policy issue afterward
- Cite sources whenever possible at the end, not inline
- No need to mention your knowledge cutoff
- No need to disclose you're an AI
- Please respect my prettier preferences when you provide code.
- Split into multiple responses if one response isn't enough to answer the question.

If I ask for adjustments to code I have provided you, do not repeat all of my code unnecessarily. Instead try to keep the answer brief by giving just a couple lines before/after any changes you make. Multiple code blocks are ok.

---

# Project Rules — 黃金島 (TypeScript / React / Next.js)

本檔案為專案層級的常駐規範，適用於此工作區內所有程式碼撰寫、重構與審查。

## 1. TypeScript 型別規範

- 以 `strict: true`（並假設開啟 `noUncheckedIndexedAccess`）為基準撰寫所有程式碼。
- **禁止** `any`、`@ts-ignore`、`@ts-nocheck` 與無根據的 `as` 型別斷言；必要時只能使用 `@ts-expect-error` 並附上原因註解。
- 外部輸入（API payload、URL params、表單、環境變數、`JSON.parse`）一律先以 `unknown` 接收，經 runtime schema（如 Zod / Valibot）驗證後再取得型別。
- 優先以**單一真相來源**推導型別（`z.infer`、`as const`、`satisfies`），避免手寫重複 interface。
- 使用 **discriminated union** 表達互斥狀態（例如 `{ status: 'idle' } | { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error }`），避免多個獨立 boolean flag 產生非法狀態組合。
- 純型別匯入一律使用 `import type`。

## 2. React & Next.js（App Router）架構規範

- **Server Components 優先**：元件預設為 RSC；僅在需要事件、瀏覽器 API 或 client state 時才標記 `'use client'`，並將 client boundary 下推至最小葉節點。
- **資料流與安全邊界**：
  - 禁止在 `useEffect` 內抓取頁面初始資料；改由 Server Component、Route Handler 或資料層（如 TanStack Query）處理。
  - 所有 Server Actions / Route Handlers 必須各自執行驗證（auth + input schema），不得信任 client 傳入的身分或權限欄位。
  - 跨 Server / Client 邊界只傳遞可序列化資料，不傳遞 class 實例、函式或完整 ORM entity（應先投影為 DTO）。
- **狀態與 Effect 紀律**：
  - 可從 props 或既有 state 推導的值直接計算，禁止用 `useEffect` + `useState` 做狀態同步。
  - 除非有實測效能瓶頸、或需維持 referential equality（如傳給 memoized 子元件 / effect 依賴），否則不預設濫用 `useMemo`、`useCallback`。
- **關注點分離**：UI 元件不直接操作資料庫或寫死複雜業務規則；業務邏輯抽離至 `services/` 或 `lib/`，讓純邏輯可獨立單元測試。

## 3. 檔案結構與命名

- 採 **feature-based（功能模組優先）** 組織程式碼，避免把所有檔案塞進扁平的 `components/` 與 `utils/`：
  ```text
  src/
    app/                  # Next.js App Router 路由、layout、route handlers（保持薄層）
    features/<domain>/    # 按業務領域切分：components/、hooks/、services/、schemas/、types.ts
    components/ui/        # 無業務邏輯的共用原子 UI 元件
    lib/                  # 基礎設施（db、auth、env、http client、共用工具）
    types/                # 跨領域共用型別
  ```
- **命名慣例**：
  - 檔名：`kebab-case`（如 `user-profile.tsx`、`use-debounce.ts`、`order.service.ts`）；Next.js 特殊檔遵循框架命名（`page.tsx`、`layout.tsx`、`route.ts`、`loading.tsx`、`error.tsx`）。
  - 元件與型別：`PascalCase`；函式與變數：`camelCase`；常數：`UPPER_SNAKE_CASE`。
  - 布林變數與回傳布林的函式統一加 `is`、`has`、`should`、`can` 前綴。
- 優先使用 **named export**（框架強制 default export 的路由檔除外）。
- **避免過度使用 barrel files（`index.ts` re-export）**，防止循環依賴與 Next.js bundler / HMR 效能劣化。

## 4. 程式碼風格

- 嚴格遵守專案內的 Prettier / ESLint（或 Biome）設定；修改既有檔案時沿用周圍慣例，不做無關的全文重新格式化。
- 使用 **early return** 壓平控制流程，巢狀超過 3 層即考慮抽函式。
- 消除魔術數字與散落的硬編碼字串，收斂為具名常數或 union type。
- 註解只說明 **Why**（業務限制、效能權衡、非直覺 workaround），不寫重複程式碼字面意思的 **What**。

## 5. 明確禁止事項

- **禁止靜默吞錯**：不可寫空的 `catch {}` 或只 `console.log`；錯誤必須保留上下文並交由上層 error boundary 或統一錯誤處理機制處理。
- **禁止硬編碼機密與外洩**：所有機密走環境變數並在啟動時集中驗證（如 `src/lib/env.ts`）；非公開變數絕不加 `NEXT_PUBLIC_` 前綴。
- **禁止無故新增依賴**：原生 Web API / TypeScript 標準能力能乾淨解決的功能，不引進重型套件。
- **禁止殘留死碼**：不保留註解掉的舊程式碼、未使用的變數與過渡性 `console.log`。
- **禁止越界重構**：除明確要求外，修改任務時不順手重寫無關模組。
