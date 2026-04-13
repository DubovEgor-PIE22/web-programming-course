// src/routes/sessions.ts
// LR9 Checkpoint 3 — Session endpoints с бизнес-логикой через sessionService

import { Hono } from "hono";
import { sessionService, NotFoundError, ForbiddenError, BadRequestError } from "../services/sessionService";

const sessions = new Hono();

// ── Хелпер для обработки domain errors ───────────────────────────────────────
function handleError(c: any, error: unknown) {
  if (error instanceof NotFoundError)  return c.json({ error: error.message }, 404);
  if (error instanceof ForbiddenError) return c.json({ error: error.message }, 403);
  if (error instanceof BadRequestError) return c.json({ error: error.message }, 400);
  console.error("[sessions]", error);
  return c.json({ error: "Internal server error" }, 500);
}

// ── GET /api/sessions — список сессий текущего пользователя ──────────────────
sessions.get("/", async (c) => {
  const user = c.get("user") as { id: string };
  try {
    const list = await sessionService.getUserSessions(user.id);
    return c.json({ sessions: list });
  } catch (e) {
    return handleError(c, e);
  }
});

// ── POST /api/sessions — создать новую сессию ─────────────────────────────────
sessions.post("/", async (c) => {
  const user = c.get("user") as { id: string };
  try {
    const session = await sessionService.createSession(user.id);
    return c.json({ session }, 201);
  } catch (e) {
    return handleError(c, e);
  }
});

// ── GET /api/sessions/:id — получить сессию с ответами ───────────────────────
sessions.get("/:id", async (c) => {
  const user = c.get("user") as { id: string; role: string };
  const sessionId = c.req.param("id");
  try {
    const session = await sessionService.getSession(
      sessionId,
      user.id,
      user.role === "admin"
    );
    return c.json({ session });
  } catch (e) {
    return handleError(c, e);
  }
});

// ── POST /api/sessions/:id/submit — завершить сессию ─────────────────────────
sessions.post("/:id/submit", async (c) => {
  const user = c.get("user") as { id: string };
  const sessionId = c.req.param("id");
  try {
    const session = await sessionService.submitSession(sessionId, user.id);
    return c.json({ session });
  } catch (e) {
    return handleError(c, e);
  }
});

export { sessions };
