// src/middleware/admin.ts
// LR9 Checkpoint 5 — проверка admin роли

import type { Context, Next } from "hono";

/**
 * Middleware requireAdmin.
 * Должен стоять ПОСЛЕ authMiddleware (который кладёт user в c.get("user")).
 * Возвращает 403 если пользователь не admin.
 */
export async function requireAdmin(c: Context, next: Next) {
  const user = c.get("user") as { role: string } | undefined;

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (user.role !== "admin") {
    return c.json(
      { error: "Forbidden: admin access required" },
      403
    );
  }

  await next();
}
