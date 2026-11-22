import { z } from 'zod';

const envSchema = z
  .object({
    GOOGLE_APP_SCRIPT_URL: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val && val.length > 0 ? val : null))
      .refine(
        (val) => {
          if (val === null) return true;
          try {
            const parsed = new URL(val);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:';
          } catch {
            return false;
          }
        },
        { message: 'GOOGLE_APP_SCRIPT_URL 必須是有效的 http(s) URL' },
      ),
    PASS_THRESHOLD: z.coerce.number().int().min(1).default(5),
    QUESTION_COUNT: z.coerce.number().int().min(1).max(100).default(8),
  })
  .refine((data) => data.PASS_THRESHOLD <= data.QUESTION_COUNT, {
    message: 'PASS_THRESHOLD 不可大於 QUESTION_COUNT',
    path: ['PASS_THRESHOLD'],
  });

export type AppEnv = z.infer<typeof envSchema>;

function parseEnv(): AppEnv {
  const raw: unknown = {
    GOOGLE_APP_SCRIPT_URL: import.meta.env.GOOGLE_APP_SCRIPT_URL,
    PASS_THRESHOLD: import.meta.env.PASS_THRESHOLD ?? 5,
    QUESTION_COUNT: import.meta.env.QUESTION_COUNT ?? 8,
  };

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('；');
    throw new Error(`環境變數驗證失敗：${details}`);
  }

  return parsed.data;
}

export const appEnv: AppEnv = parseEnv();
export const isDemoMode = appEnv.GOOGLE_APP_SCRIPT_URL === null;
