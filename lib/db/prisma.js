import { PrismaClient } from "@prisma/client";

// Standard Next.js singleton pattern — prevents exhausting the DB
// connection pool from hot-reload creating a new client per edit.
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
