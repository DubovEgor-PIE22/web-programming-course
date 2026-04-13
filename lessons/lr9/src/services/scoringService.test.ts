// src/services/scoringService.test.ts
// LR9 Checkpoint 1 — тесты для ScoringService

import { describe, it, expect } from "vitest";
import { scoringService } from "./scoringService";

// ─────────────────────────────────────────────────────────────────────────────
describe("scoreSingleSelect()", () => {
  it("returns maxPoints for correct answer", () => {
    expect(scoringService.scoreSingleSelect("A", "A", 2)).toBe(2);
  });

  it("returns 0 for wrong answer", () => {
    expect(scoringService.scoreSingleSelect("A", "B", 2)).toBe(0);
  });

  it("defaults maxPoints to 1", () => {
    expect(scoringService.scoreSingleSelect("C", "C")).toBe(1);
  });

  it("is case-sensitive", () => {
    expect(scoringService.scoreSingleSelect("a", "A")).toBe(0);
  });

  it("returns 0 for empty student answer", () => {
    expect(scoringService.scoreSingleSelect("A", "")).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("scoreMultipleSelect()", () => {
  it("returns full score when all correct and no extra", () => {
    const { score } = scoringService.scoreMultipleSelect(["A", "C"], ["A", "C"], 2);
    expect(score).toBe(2);
  });

  it("returns 0 when all answers are wrong", () => {
    const { score } = scoringService.scoreMultipleSelect(["A", "C"], ["B", "D"], 2);
    expect(score).toBe(0);
  });

  it("penalises extra incorrect selections", () => {
    // correct=2, incorrect=1 → raw=(2-0.5)/2*2 = 1.5
    const { score } = scoringService.scoreMultipleSelect(["A", "C"], ["A", "B", "C"], 2);
    expect(score).toBe(1.5);
  });

  it("score is never negative", () => {
    const { score } = scoringService.scoreMultipleSelect(
      ["A"],
      ["B", "C", "D"],
      1
    );
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("partial correct gives partial score", () => {
    // correct=1/2, incorrect=0 → raw=1/2*1 = 0.5
    const { score } = scoringService.scoreMultipleSelect(["A", "C"], ["A"], 1);
    expect(score).toBe(0.5);
  });

  it("returns detailed correct/incorrect/missed counts", () => {
    const result = scoringService.scoreMultipleSelect(
      ["A", "B", "C"],
      ["A", "B", "D"]
    );
    expect(result.correct).toBe(2);
    expect(result.incorrect).toBe(1);
    expect(result.missed).toBe(1);
  });

  it("handles empty student answers", () => {
    const { score } = scoringService.scoreMultipleSelect(["A", "B"], [], 2);
    expect(score).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("scoreEssay()", () => {
  const rubric = [
    { criterionId: "content", maxPoints: 6 },
    { criterionId: "clarity", maxPoints: 4 },
  ];

  it("returns full score when all criteria maxed", () => {
    const { score, maxScore, percentage } = scoringService.scoreEssay(
      [
        { criterionId: "content", points: 6 },
        { criterionId: "clarity", points: 4 },
      ],
      rubric
    );
    expect(score).toBe(10);
    expect(maxScore).toBe(10);
    expect(percentage).toBe(100);
  });

  it("returns 0 when all grades are 0", () => {
    const { score } = scoringService.scoreEssay(
      [
        { criterionId: "content", points: 0 },
        { criterionId: "clarity", points: 0 },
      ],
      rubric
    );
    expect(score).toBe(0);
  });

  it("caps grade at criterion maxPoints", () => {
    const { score } = scoringService.scoreEssay(
      [
        { criterionId: "content", points: 999 }, // превышение → capped at 6
        { criterionId: "clarity", points: 4 },
      ],
      rubric
    );
    expect(score).toBe(10);
  });

  it("handles missing grade for a criterion (treated as 0)", () => {
    const { score } = scoringService.scoreEssay(
      [{ criterionId: "content", points: 3 }], // clarity отсутствует
      rubric
    );
    expect(score).toBe(3);
  });

  it("calculates correct percentage for partial grades", () => {
    const { percentage } = scoringService.scoreEssay(
      [
        { criterionId: "content", points: 3 },
        { criterionId: "clarity", points: 2 },
      ],
      rubric
    );
    expect(percentage).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("calculateTotalScore()", () => {
  it("sums all non-null scores", () => {
    const total = scoringService.calculateTotalScore([
      { score: 2 },
      { score: 1.5 },
      { score: 3 },
    ]);
    expect(total).toBe(6.5);
  });

  it("ignores null scores (essay pending)", () => {
    const total = scoringService.calculateTotalScore([
      { score: 2 },
      { score: null },
      { score: 1 },
    ]);
    expect(total).toBe(3);
  });

  it("returns 0 for empty answers", () => {
    expect(scoringService.calculateTotalScore([])).toBe(0);
  });

  it("returns 0 when all scores are null", () => {
    const total = scoringService.calculateTotalScore([
      { score: null },
      { score: null },
    ]);
    expect(total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("scoreAnswer() dispatcher", () => {
  it("dispatches to single-select correctly", () => {
    const { score, isCorrect } = scoringService.scoreAnswer(
      "single-select",
      "A",
      "A",
      1
    );
    expect(score).toBe(1);
    expect(isCorrect).toBe(true);
  });

  it("dispatches to multiple-select correctly", () => {
    const { score } = scoringService.scoreAnswer(
      "multiple-select",
      ["A", "B"],
      ["A", "B"],
      2
    );
    expect(score).toBe(2);
  });

  it("essay returns score=0 and isCorrect=null", () => {
    const { score, isCorrect } = scoringService.scoreAnswer("essay", null, "some text", 5);
    expect(score).toBe(0);
    expect(isCorrect).toBeNull();
  });

  it("throws for unknown type", () => {
    expect(() =>
      scoringService.scoreAnswer("unknown-type", "A", "A", 1)
    ).toThrow();
  });
});
