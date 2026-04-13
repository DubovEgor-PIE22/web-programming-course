// src/routes/admin.ts
// LR9 Checkpoint 5 — Admin endpoints

import { Hono } from "hono";
import { prisma } from "../db";
import { requireAdmin } from "../middleware/admin";
import {
  questionSchema,
  gradeSchema,
  paginationSchema,
  parseBody,
  parseQuery,
} from "../utils/validation";
import { scoringService } from "../services/scoringService";

const admin = new Hono();

// Все маршруты требуют admin роли
admin.use("/*", requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// Вопросы
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/questions — все вопросы с количеством ответов
admin.get("/questions", async (c) => {
  const questions = await prisma.question.findMany({
    include: {
      category: { select: { name: true, slug: true } },
      _count: { select: { answers: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ questions });
});

// POST /api/admin/questions — создать вопрос
admin.post("/questions", async (c) => {
  try {
    const body = await parseBody(c, questionSchema);

    const question = await prisma.question.create({
      data: {
        text: body.text,
        type: body.type,
        categoryId: body.categoryId,
        correctAnswer: body.correctAnswer
          ? JSON.stringify(body.correctAnswer)
          : null,
        points: body.points,
      },
    });

    return c.json({ question }, 201);
  } catch (e: any) {
    if (e?.status) {
      return c.json({ error: "Validation failed", details: e.errors }, e.status);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});

// PUT /api/admin/questions/:id — обновить вопрос
admin.put("/questions/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const body = await parseBody(c, questionSchema);

    const question = await prisma.question.update({
      where: { id },
      data: {
        text: body.text,
        type: body.type,
        categoryId: body.categoryId,
        correctAnswer: body.correctAnswer
          ? JSON.stringify(body.correctAnswer)
          : null,
        points: body.points,
      },
    });

    return c.json({ question });
  } catch (e: any) {
    if (e?.code === "P2025") return c.json({ error: "Question not found" }, 404);
    if (e?.status) return c.json({ error: "Validation failed", details: e.errors }, e.status);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Essay grading
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/answers/pending — essay ответы без проверки (с пагинацией)
admin.get("/answers/pending", async (c) => {
  const { page, limit } = parseQuery(c, paginationSchema);
  const skip = (page - 1) * limit;

  const [total, answers] = await prisma.$transaction([
    prisma.answer.count({
      where: {
        score: null,
        question: { type: "essay" },
      },
    }),
    prisma.answer.findMany({
      where: {
        score: null,
        question: { type: "essay" },
      },
      include: {
        question: {
          select: { text: true, type: true, points: true },
        },
        session: {
          select: {
            id: true,
            status: true,
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
  ]);

  return c.json({
    answers,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  });
});

// POST /api/admin/answers/:id/grade — выставить оценку за essay
admin.post("/answers/:id/grade", async (c) => {
  const answerId = c.req.param("id");

  try {
    const { grades, comment } = await parseBody(c, gradeSchema);

    const result = await prisma.$transaction(async (tx) => {
      // Найти ответ
      const answer = await tx.answer.findUnique({
        where: { id: answerId },
        include: {
          question: true,
          session: { include: { answers: true } },
        },
      });

      if (!answer) throw { status: 404, message: "Answer not found" };
      if (answer.score !== null) throw { status: 400, message: "Answer already graded" };

      // Подсчитать балл через rubric
      const rubric = [
        { criterionId: "content", maxPoints: Math.ceil(answer.question.points * 0.6) },
        { criterionId: "clarity", maxPoints: Math.ceil(answer.question.points * 0.4) },
      ];
      const { score } = scoringService.scoreEssay(grades, rubric);

      // Обновить ответ
      const updatedAnswer = await tx.answer.update({
        where: { id: answerId },
        data: { score, isCorrect: score >= answer.question.points * 0.5 },
      });

      // Проверить: все ли ответы сессии теперь проверены?
      const allAnswers = await tx.answer.findMany({
        where: { sessionId: answer.sessionId },
        select: { score: true },
      });

      const allGraded = allAnswers.every((a) => a.score !== null);

      if (allGraded && answer.session.status === "in_progress") {
        // Завершить сессию с итоговым баллом
        const totalScore = scoringService.calculateTotalScore(allAnswers);
        await tx.session.update({
          where: { id: answer.sessionId },
          data: {
            status: "completed",
            score: totalScore,
            completedAt: new Date(),
          },
        });
      }

      return { answer: updatedAnswer, comment };
    });

    return c.json(result);
  } catch (e: any) {
    if (e?.status === 404) return c.json({ error: e.message }, 404);
    if (e?.status === 400) return c.json({ error: e.message }, 400);
    if (e?.status)         return c.json({ error: "Validation failed", details: e.errors }, e.status);
    console.error("[admin/grade]", e);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Статистика студентов
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/students/:userId/stats — статистика конкретного студента
admin.get("/students/:userId/stats", async (c) => {
  const userId = c.req.param("userId");

  const sessions = await prisma.session.findMany({
    where: { userId, status: "completed" },
    select: { score: true, completedAt: true, startedAt: true },
  });

  if (sessions.length === 0) {
    return c.json({
      userId,
      completedSessions: 0,
      averageScore: null,
      minScore: null,
      maxScore: null,
    });
  }

  const scores = sessions.map((s) => s.score ?? 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  return c.json({
    userId,
    completedSessions: sessions.length,
    averageScore: Math.round(avg * 100) / 100,
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
  });
});

export { admin };
