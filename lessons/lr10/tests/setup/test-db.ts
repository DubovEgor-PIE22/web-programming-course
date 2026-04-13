import { beforeEach, afterEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// Shared test Prisma client (uses dev.db or separate test DB via DATABASE_URL)
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL ?? "file:./test.db",
    },
  },
});

beforeEach(async () => {
  // Clean tables in dependency order before each test
  await prisma.answer.deleteMany().catch(() => {});
  await prisma.session.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
});

afterEach(async () => {
  // Extra cleanup if needed
});

afterAll(async () => {
  await prisma.$disconnect();
});
