// src/utils/validation.ts
// LR9 Checkpoint 4 — Zod schemas для валидации входных данных

import { z } from "zod";

// ── Answer ────────────────────────────────────────────────────────────────────
// userAnswer может быть строкой, массивом строк или текстом (essay)
const userAnswerSchema = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1),
]);

export const answerSchema = z.object({
  questionId: z.string().cuid({ message: "questionId must be a valid CUID" }),
  userAnswer: userAnswerSchema,
});

export type AnswerInput = z.infer<typeof answerSchema>;

// ── Essay grade ───────────────────────────────────────────────────────────────
export const essayGradeCriterionSchema = z.object({
  criterionId: z.string().min(1),
  points: z.number().nonnegative(),
});

export const gradeSchema = z.object({
  grades: z.array(essayGradeCriterionSchema).min(1),
  comment: z.string().max(1000).optional(),
});

export type GradeInput = z.infer<typeof gradeSchema>;

// ── Question ──────────────────────────────────────────────────────────────────
export const questionSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(["single-select", "multiple-select", "essay"]),
  categoryId: z.string().cuid({ message: "categoryId must be a valid CUID" }),
  // correctAnswer: опционально для essay, обязательно для остальных
  correctAnswer: z
    .union([
      z.string().min(1),           // single-select: "A"
      z.array(z.string().min(1)),  // multiple-select: ["A", "C"]
    ])
    .optional(),
  points: z.number().int().positive().default(1),
}).refine(
  (data) =>
    data.type === "essay" || data.correctAnswer !== undefined,
  { message: "correctAnswer is required for non-essay questions", path: ["correctAnswer"] }
);

export type QuestionInput = z.infer<typeof questionSchema>;

// ── Category ──────────────────────────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, digits and hyphens"),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ── Pagination ────────────────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// ── Helper: parse or throw 400 ────────────────────────────────────────────────
import type { Context } from "hono";

export async function parseBody<T>(
  c: Context,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await c.req.json().catch(() => null);
  const result = schema.safeParse(body);
  if (!result.success) {
    throw { status: 400, errors: result.error.flatten() };
  }
  return result.data;
}

export function parseQuery<T>(c: Context, schema: z.ZodSchema<T>): T {
  const raw = c.req.query();
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw { status: 400, errors: result.error.flatten() };
  }
  return result.data;
}
