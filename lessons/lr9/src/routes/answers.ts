// src/routes/answers.ts
// LR9 Checkpoint 3 — Answer endpoints (вложенные в session)

import { Hono } from "hono";
import { sessionService, NotFoundError, ForbiddenError, BadRequestError } from "../services/sessionService";
import { answerSchema, parseBody } from "../utils/validation";

const answers = new Hono();

function handleError(c: any, error: unknown) {
  if (error instanceof NotFoundError)   return c.json({ error: error.message }, 404);
  if (error instanceof ForbiddenError)  return c.json({ error: error.message }, 403);
  if (error instanceof BadRequestError) return c.json({ error: error.message }, 400);
  // Zod parse errors (из parseBody)
  if (typeof error === "object" && error !== null && "status" in error) {
    const e = error as any;
    return c.json({ error: "Validation failed", details: e.errors }, e.status);
  }
  console.error("[answers]", error);
  return c.json({ error: "Internal server error" }, 500);
}

// ── POST /api/sessions/:id/answers — добавить ответ ──────────────────────────
answers.post("/:id/answers", async (c) => {
  const user = c.get("user") as { id: string };
  const sessionId = c.req.param("id");

  try {
    const body = await parseBody(c, answerSchema);

    const answer = await sessionService.submitAnswer(
      sessionId,
      body.questionId,
      body.userAnswer,
      user.id
    );

    return c.json({ answer }, 201);
  } catch (e) {
    return handleError(c, e);
  }
});

export { answers };
