import { describe, it, expect } from "vitest";
import app from "../../index"; // adjust to your Hono app entry
import { createTestUser, authHeader } from "../../../tests/setup/test-app";

// ---------------------------------------------------------------------------
// Sessions feature tests — real DB, no mocking
// ---------------------------------------------------------------------------

describe("GET /api/sessions", () => {
  it("returns 200 with sessions list for authenticated user", async () => {
    const { token } = await createTestUser("student");

    const res = await app.request("/api/sessions", {
      method: "GET",
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it("returns 401 without token", async () => {
    const res = await app.request("/api/sessions", { method: "GET" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/sessions", () => {
  it("creates a new session for authenticated student", async () => {
    const { token } = await createTestUser("student");

    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: 1 }),
    });

    expect([200, 201]).toContain(res.status);
    const json = await res.json();
    expect(json).toHaveProperty("id");
  });

  it("returns 400 for missing quizId", async () => {
    const { token } = await createTestUser("student");

    const res = await app.request("/api/sessions", {
      method: "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/sessions/:id", () => {
  it("returns session details for the owner", async () => {
    const { token } = await createTestUser("student");

    // Create session first
    const createRes = await app.request("/api/sessions", {
      method: "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: 1 }),
    });
    const session = await createRes.json();

    const res = await app.request(`/api/sessions/${session.id}`, {
      method: "GET",
      headers: authHeader(token),
    });

    expect(res.status).toBe(200);
  });

  it("returns 404 for non-existent session", async () => {
    const { token } = await createTestUser("student");

    const res = await app.request("/api/sessions/999999", {
      method: "GET",
      headers: authHeader(token),
    });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Role-based access control
// ---------------------------------------------------------------------------
describe("Admin-only routes", () => {
  it("returns 403 when student accesses admin endpoint", async () => {
    const { token } = await createTestUser("student");

    const res = await app.request("/api/admin/users", {
      method: "GET",
      headers: authHeader(token),
    });

    expect(res.status).toBe(403);
  });

  it("returns 200 when admin accesses admin endpoint", async () => {
    const { token } = await createTestUser("admin");

    const res = await app.request("/api/admin/users", {
      method: "GET",
      headers: authHeader(token),
    });

    expect([200, 204]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// Answers submission
// ---------------------------------------------------------------------------
describe("POST /api/sessions/:id/answers", () => {
  it("saves answer and returns isCorrect flag", async () => {
    const { token } = await createTestUser("student");

    const createRes = await app.request("/api/sessions", {
      method: "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: 1 }),
    });
    const session = await createRes.json();

    const res = await app.request(`/api/sessions/${session.id}/answers`, {
      method: "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: 1, selectedOption: "A" }),
    });

    expect([200, 201]).toContain(res.status);
    const json = await res.json();
    expect(json).toHaveProperty("isCorrect");
  });

  it("returns 422 for invalid payload (missing selectedOption)", async () => {
    const { token } = await createTestUser("student");

    const createRes = await app.request("/api/sessions", {
      method: "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ quizId: 1 }),
    });
    const session = await createRes.json();

    const res = await app.request(`/api/sessions/${session.id}/answers`, {
      method: "POST",
      headers: { ...authHeader(token), "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: 1 }),
    });

    expect([400, 422]).toContain(res.status);
  });
});
