/**
 * Run the metric definitions migration
 * This script runs the SQL migration to create the tables
 */

import { db } from "../server/db.js";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  console.log("🔄 Running metric definitions migration...");

  try {
    const migrationSQL = readFileSync(
      join(process.cwd(), "migrations", "create_metric_definitions.sql"),
      "utf-8"
    );

    // Execute the entire migration SQL (PostgreSQL handles multi-statement SQL)
    // Remove comments first
    const cleanSQL = migrationSQL
      .split("\n")
      .filter(line => !line.trim().startsWith("--"))
      .join("\n");
    
    await db.execute(sql.raw(cleanSQL));

    console.log("✅ Migration completed successfully!");
  } catch (error: any) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

runMigration()
  .then(() => {
    console.log("\n✅ Migration script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Migration script failed:", error);
    process.exit(1);
  });

