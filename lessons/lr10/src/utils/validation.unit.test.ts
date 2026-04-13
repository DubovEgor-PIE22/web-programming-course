import { describe, it, expect } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Re-declare the schemas here or import from your validation.ts
// Adjust the import path to match your project structure:
//   import { loginSchema, registerSchema, answerSchema } from "./validation";
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["student", "admin"]).default("student"),
});

const answerSchema = z.object({
  sessionId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  selectedOption: z.string().min(1),
});

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------
describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(() =>
      loginSchema.parse({ email: "user@test.com", password: "secret123" })
    ).not.toThrow();
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 6 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@test.com",
      password: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email field", () => {
    const result = loginSchema.safeParse({ password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password field", () => {
    const result = loginSchema.safeParse({ email: "user@test.com" });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------
describe("registerSchema", () => {
  it("accepts valid registration with default role", () => {
    const data = registerSchema.parse({
      email: "new@example.com",
      password: "password1",
    });
    expect(data.role).toBe("student");
  });

  it("accepts explicit admin role", () => {
    const data = registerSchema.parse({
      email: "admin@example.com",
      password: "adminpass",
      role: "admin",
    });
    expect(data.role).toBe("admin");
  });

  it("rejects unknown role value", () => {
    const result = registerSchema.safeParse({
      email: "x@x.com",
      password: "password1",
      role: "superuser",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// answerSchema
// ---------------------------------------------------------------------------
describe("answerSchema", () => {
  it("accepts valid answer payload", () => {
    expect(() =>
      answerSchema.parse({ sessionId: 1, questionId: 2, selectedOption: "A" })
    ).not.toThrow();
  });

  it("rejects negative sessionId", () => {
    const result = answerSchema.safeParse({
      sessionId: -1,
      questionId: 2,
      selectedOption: "A",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero questionId", () => {
    const result = answerSchema.safeParse({
      sessionId: 1,
      questionId: 0,
      selectedOption: "A",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty selectedOption", () => {
    const result = answerSchema.safeParse({
      sessionId: 1,
      questionId: 1,
      selectedOption: "",
    });
    expect(result.success).toBe(false);
  });
});
