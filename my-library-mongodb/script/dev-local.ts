/**
 * dev-local.ts
 *
 * Local development startup script.
 * Automatically spins up an in-memory MongoDB instance using
 * mongodb-memory-server so the app runs without a real Atlas cluster.
 *
 * Usage:  npm run dev:local
 */

import { MongoMemoryServer } from "mongodb-memory-server";

// ── 1. Boot in-memory MongoDB ──────────────────────────────────────────────
console.log("\n📦  Starting MongoDB Memory Server…");
console.log(
  "    (First run downloads the MongoDB binary — may take a minute)\n"
);

const mongod = await MongoMemoryServer.create({
  instance: {
    dbName: "mylibrary",
  },
});

const uri = mongod.getUri("mylibrary");
process.env.MONGODB_URI = uri;

console.log("✅  MongoDB Memory Server ready");
console.log("    URI:", uri, "\n");

// ── 2. Graceful shutdown ───────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down…`);
  try {
    await mongod.stop();
    console.log("    MongoDB Memory Server stopped.");
  } catch (err) {
    console.error("    Error stopping MongoDB Memory Server:", err);
  }
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ── 3. Start the Express + Vite dev server ─────────────────────────────────
// server/index.ts contains a self-invoking async block that calls
// initDatabase(), registerRoutes(), setupVite() and httpServer.listen().
// Importing it here is enough to kick everything off.
await import("../server/index.ts");
