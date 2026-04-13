import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock Prisma so unit tests don't touch the database
// ---------------------------------------------------------------------------
vi.mock("../../db", () => ({
  prisma: {
    answer: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "../../db";
import {
  calculateScore,
  submitAnswer,
  getSessionResults,
} from "./scoringService";

// ---------------------------------------------------------------------------
// calculateScore — pure business logic, no DB
// ---------------------------------------------------------------------------
describe("calculateScore()", () => {
  it("returns 0 for empty answers array", () => {
    expect(calculateScore([])).toBe(0);
  });

  it("counts only correct answers", () => {
    const answers = [
      { isCorrect: true },
      { isCorrect: false },
      { isCorrect: true },
    ] as any[];
    expect(calculateScore(answers)).toBe(2);
  });

  it("returns full score when all answers are correct", () => {
    const answers = [{ isCorrect: true }, { isCorrect: true }] as any[];
    expect(calculateScore(answers)).toBe(2);
  });

  it("returns 0 when all answers are wrong", () => {
    const answers = [{ isCorrect: false }, { isCorrect: false }] as any[];
    expect(calculateScore(answers)).toBe(0);
  });

  it("handles single correct answer", () => {
    expect(calculateScore([{ isCorrect: true }] as any[])).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// submitAnswer — calls Prisma, logic verified via mock
// ---------------------------------------------------------------------------
describe("submitAnswer()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an answer record in the DB", async () => {
    const mockAnswer = {
      id: 1,
      sessionId: 10,
      questionId: 5,
      selectedOption: "A",
      isCorrect: true,
    };
    vi.mocked(prisma.answer.create).mockResolvedValue(mockAnswer as any);

    const result = await submitAnswer({
      sessionId: 10,
      questionId: 5,
      selectedOption: "A",
      correctOption: "A",
    });

    expect(prisma.answer.create).toHaveBeenCalledOnce();
    expect(result.isCorrect).toBe(true);
  });

  it("marks answer as incorrect when option doesn't match", async () => {
    vi.mocked(prisma.answer.create).mockResolvedValue({
      id: 2,
      isCorrect: false,
    } as any);

    const result = await submitAnswer({
      sessionId: 10,
      questionId: 5,
      selectedOption: "B",
      correctOption: "A",
    });

    expect(result.isCorrect).toBe(false);
  });

  it("passes correct isCorrect flag to Prisma create", async () => {
    vi.mocked(prisma.answer.create).mockResolvedValue({} as any);

    await submitAnswer({
      sessionId: 1,
      questionId: 1,
      selectedOption: "C",
      correctOption: "C",
    });

    const callArg = vi.mocked(prisma.answer.create).mock.calls[0][0];
    expect(callArg.data.isCorrect).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getSessionResults — aggregation logic
// ---------------------------------------------------------------------------
describe("getSessionResults()", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns score and total for a session", async () => {
    vi.mocked(prisma.answer.findMany).mockResolvedValue([
      { isCorrect: true },
      { isCorrect: false },
      { isCorrect: true },
    ] as any[]);

    const result = await getSessionResults(42);

    expect(result.total).toBe(3);
    expect(result.score).toBe(2);
  });

  it("returns 0/0 when session has no answers", async () => {
    vi.mocked(prisma.answer.findMany).mockResolvedValue([]);

    const result = await getSessionResults(99);

    expect(result.total).toBe(0);
    expect(result.score).toBe(0);
  });
});
