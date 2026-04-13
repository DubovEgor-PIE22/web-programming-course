// src/services/sessionService.ts
// LR9 Checkpoint 3 — управление жизненным циклом сессии

import { prisma } from "../db";
import { scoringService } from "./scoringService";

const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 час

// ─────────────────────────────────────────────────────────────────────────────
class SessionService {
  // ── Создать сессию ─────────────────────────────────────────────────────────
  async createSession(userId: string) {
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const session = await prisma.session.create({
      data: {
        userId,
        expiresAt,
        status: "in_progress",
      },
      select: {
        id: true,
        userId: true,
        status: true,
        startedAt: true,
        expiresAt: true,
      },
    });

    return session;
  }

  // ── Получить сессию со всеми ответами ─────────────────────────────────────
  async getSession(sessionId: string, requestingUserId: string, isAdmin = false) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        answers: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                points: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!session) throw new NotFoundError("Session not found");

    // Только владелец или admin может видеть сессию
    if (!isAdmin && session.userId !== requestingUserId) {
      throw new ForbiddenError("Access denied");
    }

    return session;
  }

  // ── Добавить ответ ─────────────────────────────────────────────────────────
  async submitAnswer(
    sessionId: string,
    questionId: string,
    userAnswer: unknown,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Проверить что сессия существует и принадлежит пользователю
      const session = await tx.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) throw new NotFoundError("Session not found");
      if (session.userId !== userId) throw new ForbiddenError("Access denied");
      if (session.status !== "in_progress") {
        throw new BadRequestError(`Session is ${session.status}`);
      }
      if (session.expiresAt < new Date()) {
        // Автоматически пометить сессию как просроченную
        await tx.session.update({
          where: { id: sessionId },
          data: { status: "expired" },
        });
        throw new BadRequestError("Session has expired");
      }

      // 2. Получить вопрос с правильным ответом
      const question = await tx.question.findUnique({
        where: { id: questionId },
      });
      if (!question) throw new NotFoundError("Question not found");

      // 3. Вычислить балл
      const correctAnswer = question.correctAnswer
        ? JSON.parse(question.correctAnswer)
        : null;

      const { score, isCorrect } = scoringService.scoreAnswer(
        question.type,
        correctAnswer,
        userAnswer,
        question.points
      );

      // 4. Upsert ответа (один ответ на вопрос в сессии — @@unique)
      const answer = await tx.answer.upsert({
        where: { sessionId_questionId: { sessionId, questionId } },
        create: {
          sessionId,
          questionId,
          userAnswer: JSON.stringify(userAnswer),
          score: question.type === "essay" ? null : score,
          isCorrect: question.type === "essay" ? null : isCorrect,
        },
        update: {
          userAnswer: JSON.stringify(userAnswer),
          score: question.type === "essay" ? null : score,
          isCorrect: question.type === "essay" ? null : isCorrect,
        },
      });

      return {
        ...answer,
        score: answer.score,
        isCorrect: answer.isCorrect,
        // essay: проверяется вручную
        pending: question.type === "essay",
      };
    });
  }

  // ── Завершить сессию ───────────────────────────────────────────────────────
  async submitSession(sessionId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: { answers: { select: { score: true } } },
      });

      if (!session) throw new NotFoundError("Session not found");
      if (session.userId !== userId) throw new ForbiddenError("Access denied");
      if (session.status === "completed") {
        throw new BadRequestError("Session already completed");
      }
      if (session.status === "expired") {
        throw new BadRequestError("Session has expired");
      }
      if (session.expiresAt < new Date()) {
        await tx.session.update({ where: { id: sessionId }, data: { status: "expired" } });
        throw new BadRequestError("Session has expired");
      }

      // Подсчёт итогового балла (essay с null score не учитываются)
      const totalScore = scoringService.calculateTotalScore(session.answers);

      const updated = await tx.session.update({
        where: { id: sessionId },
        data: {
          status: "completed",
          score: totalScore,
          completedAt: new Date(),
        },
      });

      return updated;
    });
  }

  // ── Список сессий пользователя ─────────────────────────────────────────────
  async getUserSessions(userId: string) {
    return await prisma.session.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        status: true,
        score: true,
        startedAt: true,
        expiresAt: true,
        completedAt: true,
        _count: { select: { answers: true } },
      },
    });
  }
}

// ── Domain errors ─────────────────────────────────────────────────────────────
export class NotFoundError extends Error { constructor(msg: string) { super(msg); this.name = "NotFoundError"; } }
export class ForbiddenError extends Error { constructor(msg: string) { super(msg); this.name = "ForbiddenError"; } }
export class BadRequestError extends Error { constructor(msg: string) { super(msg); this.name = "BadRequestError"; } }

export const sessionService = new SessionService();
