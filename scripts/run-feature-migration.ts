import { db } from "../server/db.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";

async function runMigration() {
  try {
    const migrationPath = join(process.cwd(), "migrations", "add_metric_features.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    // Remove comments and clean SQL
    const cleanSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    
    if (!cleanSQL) {
      console.log("No SQL to execute");
      return;
    }
    
    console.log("Running metric features migration...");
    await db.execute(sql.raw(cleanSQL));
    console.log("✓ Metric features migration completed successfully!");
  } catch (error) {
    console.error("Error running migration:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

runMigration();


