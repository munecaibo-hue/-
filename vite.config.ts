import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function normalizeBasePath(rawBase: string | undefined): string {
  const trimmed = rawBase?.trim();
  if (!trimmed || trimmed === '/' || trimmed === '//') {
    return '/';
  }
  const withoutSlashes = trimmed.replace(/^\/+|\/+$/g, '');
  return `/${withoutSlashes}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: normalizeBasePath(env.BASE_PATH),
    plugins: [react()],
    // 允許前端直接讀取 spec 指定的環境變數名稱，無須強制加 VITE_ 前綴
    envPrefix: ['VITE_', 'GOOGLE_', 'PASS_', 'QUESTION_'],
  };
});
