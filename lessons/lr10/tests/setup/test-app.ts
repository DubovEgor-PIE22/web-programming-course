import { sign } from "jsonwebtoken";
import { prisma } from "./test-db";

const JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";

/** Create a test user and return a signed JWT token */
export async function createTestUser(
  role: "student" | "admin" = "student",
  overrides: { email?: string; password?: string } = {}
) {
  const email = overrides.email ?? `test-${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      password: "hashed_password_placeholder",
      role,
    },
  });
  const token = sign({ userId: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "1h",
  });
  return { user, token };
}

/** Build Authorization header value */
export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
