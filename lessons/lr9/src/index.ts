// src/index.ts
// LR9 — точка входа, подключаем все routes

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import jwt from "jsonwebtoken";
import { prisma } from "./db";
import { sessions } from "./routes/sessions";
import { answers } from "./routes/answers";
import { admin } from "./routes/admin";

const app = new Hono();

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

// ── Global middleware ─────────────────────────────────────────────────────────
app.use("*", logger());
app.use("*", cors());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok" }));

// ── Auth middleware (JWT) ─────────────────────────────────────────────────────
app.use("/api/*", async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = header.slice(7);
  try {
    const payload = verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
    };

    // Проверить что пользователь существует в БД
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) return c.json({ error: "Unauthorized" }, 401);

    c.set("user", user);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.route("/api/sessions", sessions);
app.route("/api/sessions", answers);  // /api/sessions/:id/answers
app.route("/api/admin", admin);

// ── Zod error handler ──────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error("[unhandled]", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3000);

export default app;

// Запуск только если это точка входа
if (process.env.NODE_ENV !== "test") {
  const { serve } = await import("@hono/node-server");
  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`[LR9] Server running on http://localhost:${PORT}`);
  });
}
