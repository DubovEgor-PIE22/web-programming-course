import { describe, it, expect, beforeAll } from "vitest";
import app from "../../index"; // adjust path to your Hono app entry
import { createTestUser } from "../../../tests/setup/test-app";

// ---------------------------------------------------------------------------
// Auth feature tests — no Prisma mocking, uses real test DB
// ---------------------------------------------------------------------------

describe("POST /api/auth/register", () => {
  it("registers a new user and returns 201 with token", async () => {
    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `reg-${Date.now()}@test.com`,
        password: "password123",
      }),
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty("token");
  });

  it("returns 400 for invalid email", async () => {
    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bad-email", password: "password123" }),
    });

    expect(res.status).toBe(400);
  });

  it("returns 409 when email is already taken", async () => {
    const email = `dup-${Date.now()}@test.com`;

    // First registration
    await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });

    // Duplicate registration
    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  it("returns 200 and token for valid credentials", async () => {
    const email = `login-${Date.now()}@test.com`;
    const password = "mypassword";

    await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("token");
  });

  it("returns 401 for wrong password", async () => {
    const email = `wrongpw-${Date.now()}@test.com`;
    await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "correctpass" }),
    });

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrongpass" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 for non-existent user", async () => {
    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nobody@nowhere.com",
        password: "anything",
      }),
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Security: no token / invalid token -> 401
// ---------------------------------------------------------------------------
describe("Auth middleware", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const res = await app.request("/api/sessions", { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for malformed token", async () => {
    const res = await app.request("/api/sessions", {
      method: "GET",
      headers: { Authorization: "Bearer this.is.not.valid" },
    });
    expect(res.status).toBe(401);
  });
});
