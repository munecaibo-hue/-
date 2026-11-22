/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GOOGLE_APP_SCRIPT_URL?: string;
  readonly PASS_THRESHOLD?: string;
  readonly QUESTION_COUNT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
