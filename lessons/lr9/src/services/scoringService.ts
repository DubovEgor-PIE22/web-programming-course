// src/services/scoringService.ts
// LR9 Checkpoint 1 — бизнес-логика подсчёта баллов

export interface MultipleSelectResult {
  score: number;    // итоговый балл за вопрос (0..maxPoints)
  correct: number;  // количество правильно выбранных
  incorrect: number;
  missed: number;   // правильные, которые не выбрал
}

export interface EssayGrade {
  criterionId: string;
  points: number; // фактически выставленные баллы за критерий
}

export interface EssayRubricCriterion {
  criterionId: string;
  maxPoints: number;
}

export interface EssayResult {
  score: number;    // итоговый балл
  maxScore: number; // максимально возможный
  percentage: number;
}

// ─────────────────────────────────────────────────────────────────────────────
class ScoringService {
  // ── Single-select ─────────────────────────────────────────────────────────
  /**
   * Простая проверка одного выбранного варианта.
   * Возвращает 1 если правильно, 0 если нет.
   */
  scoreSingleSelect(
    correctAnswer: string,
    studentAnswer: string,
    maxPoints = 1
  ): number {
    return correctAnswer === studentAnswer ? maxPoints : 0;
  }

  // ── Multiple-select ───────────────────────────────────────────────────────
  /**
   * Правила: +1 за каждый правильно выбранный, -0.5 за каждый лишний.
   * Итог нормируется до диапазона [0, maxPoints].
   *
   * Пример (correctAnswers=["A","C"], maxPoints=2):
   *   student=["A","C"]      → +2, -0   = 2.0
   *   student=["A","B","C"]  → +2, -0.5 = 1.5
   *   student=["A","B"]      → +1, -0.5 = 0.5
   *   student=["B","D"]      → +0, -1.0 = 0   (min 0)
   */
  scoreMultipleSelect(
    correctAnswers: string[],
    studentAnswers: string[],
    maxPoints = 1
  ): MultipleSelectResult {
    const correctSet = new Set(correctAnswers);
    const studentSet = new Set(studentAnswers);

    let correct = 0;
    let incorrect = 0;

    for (const ans of studentSet) {
      if (correctSet.has(ans)) {
        correct++;
      } else {
        incorrect++;
      }
    }

    const missed = correctAnswers.filter((a) => !studentSet.has(a)).length;
    const rawScore = correct * 1 - incorrect * 0.5;
    const clamped = Math.max(0, rawScore);

    // Нормируем: максимально возможный rawScore = correctAnswers.length
    const ratio = correctAnswers.length > 0
      ? clamped / correctAnswers.length
      : 0;
    const score = Math.round(ratio * maxPoints * 100) / 100;

    return { score, correct, incorrect, missed };
  }

  // ── Essay ──────────────────────────────────────────────────────────────────
  /**
   * Подсчёт баллов за essay по рубрике.
   * grades — массив оценок от проверяющего (criterionId → points)
   * rubric — описание критериев с максимальными баллами
   */
  scoreEssay(
    grades: EssayGrade[],
    rubric: EssayRubricCriterion[]
  ): EssayResult {
    const rubricMap = new Map(rubric.map((r) => [r.criterionId, r.maxPoints]));
    const gradesMap = new Map(grades.map((g) => [g.criterionId, g.points]));

    let score = 0;
    let maxScore = 0;

    for (const criterion of rubric) {
      const max = criterion.maxPoints;
      maxScore += max;

      const given = gradesMap.get(criterion.criterionId) ?? 0;
      // Не позволяем дать больше максимума за критерий
      score += Math.min(given, max);
    }

    const percentage =
      maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;

    return { score, maxScore, percentage };
  }

  // ── Generic dispatcher ────────────────────────────────────────────────────
  /**
   * Универсальный метод — выбирает стратегию по типу вопроса.
   * correctAnswer и userAnswer — уже распарсенные значения (не JSON-строки).
   */
  scoreAnswer(
    type: string,
    correctAnswer: unknown,
    userAnswer: unknown,
    maxPoints = 1
  ): { score: number; isCorrect: boolean | null } {
    if (type === "single-select") {
      const score = this.scoreSingleSelect(
        correctAnswer as string,
        userAnswer as string,
        maxPoints
      );
      return { score, isCorrect: score === maxPoints };
    }

    if (type === "multiple-select") {
      const { score } = this.scoreMultipleSelect(
        correctAnswer as string[],
        userAnswer as string[],
        maxPoints
      );
      return { score, isCorrect: score === maxPoints };
    }

    if (type === "essay") {
      // essay не может быть автопроверен
      return { score: 0, isCorrect: null };
    }

    throw new Error(`Unknown question type: ${type}`);
  }

  // ── Session total score ───────────────────────────────────────────────────
  /**
   * Суммирует баллы по всем ответам сессии.
   * essay-ответы без score игнорируются (null).
   */
  calculateTotalScore(
    answers: Array<{ score: number | null }>
  ): number {
    return answers.reduce((sum, a) => sum + (a.score ?? 0), 0);
  }
}

// Singleton — импортируется во всех routes и services
export const scoringService = new ScoringService();
