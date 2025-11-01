/**
 * Seed script for Metric Definitions
 * Run this script to populate initial metric type and metric data
 * 
 * Usage: ts-node scripts/seed-metric-definitions.ts
 * Or: npm run seed:metrics
 */

import { storage } from "../server/storage.js";
import { db } from "../server/db.js";
import { users } from "../shared/schema.js";
import { eq } from "drizzle-orm";

async function seedMetricDefinitions() {
  console.log("🌱 Starting metric definitions seed...");

  try {
    // Find a team lead user to use as creator
    const teamLeads = await db.select().from(users).where(eq(users.role, 'team_lead')).limit(1);
    let creatorId: string;
    
    if (teamLeads.length > 0) {
      creatorId = teamLeads[0].id;
      console.log(`✅ Using team lead: ${teamLeads[0].email} as creator`);
    } else {
      // Fallback: use first user or create system user
      const allUsers = await db.select().from(users).limit(1);
      if (allUsers.length === 0) {
        throw new Error("No users found. Please create a user first.");
      }
      creatorId = allUsers[0].id;
      console.log(`⚠️  No team lead found. Using first user: ${allUsers[0].email} as creator`);
    }

    // Metric Type 1: Program Delivery & Implementation Metrics
    console.log("\n📊 Creating Program Delivery & Implementation Metrics...");
    const programDeliveryType = await storage.createMetricType({
      name: "Program Delivery & Implementation Metrics",
      whatAreThey: "These are process-oriented metrics that track the on-the-ground execution of the Taleemabad model. They are leading indicators of potential impact.",
      focus: "Quantity, Quality, and Consistency of service delivery.",
      whyTheyMatter: "They ensure the program is being implemented with fidelity, which is a prerequisite for achieving outcomes.",
      keyQuestion: "Are we delivering our program to schools and teachers as planned and with quality?",
      primaryAudience: "Program Coordinator, Program Manager, PAFM, RMs, Coaches"
    }, creatorId);

    console.log(`  ✅ Created metric type: ${programDeliveryType.name}`);

    // Metrics for Program Delivery
    await storage.createMetric({
      metricTypeId: programDeliveryType.id,
      name: "Successful Coach Visit",
      definition: "A visit where the coach: (1) Visits the school, (2) Observes the class, and (3) Provides feedback.\n\nIt ensures the quality and completion of the coaching feedback loop.",
      threshold: "100% visits should be successful"
    }, creatorId);
    console.log("  ✅ Created metric: Successful Coach Visit");

    await storage.createMetric({
      metricTypeId: programDeliveryType.id,
      name: "Lesson Plan Fidelity",
      definition: "The degree to which teachers deliver lesson plans as intended, adhering to content, pedagogy, and pacing.\n\nIt measures teaching effectiveness and alignment with the intended learning model.",
      threshold: "LP fidelity score should be more than 60%"
    }, creatorId);
    console.log("  ✅ Created metric: Lesson Plan Fidelity");

    await storage.createMetric({
      metricTypeId: programDeliveryType.id,
      name: "Training Completion Rate",
      definition: "Measures the uptake of professional development.\n\nTeacher capacity building is critical for sustaining improvements in pedagogy.",
      threshold: "The target of training engagement metrics will vary across 4 training levels (L0-L3), and will be the same as the percentage of teachers who need to complete each level of training, with targets of 90% for L0 and L1, 50% for L2, and 30% for L3.\n\nWe set our benchmarks at 90–50–30 so that we build a pyramid of teacher expertise. Almost all teachers (90%) build the basics, half (50%) deepen their practice, and about a third (30% = 1,200 teachers) reach coach level. This structure ensures we have enough skilled coaches to support the system, while still keeping targets realistic."
    }, creatorId);
    console.log("  ✅ Created metric: Training Completion Rate");

    // Metric Type 2: Product Analytics & Adoption
    console.log("\n📊 Creating Product Analytics & Adoption...");
    const productAnalyticsType = await storage.createMetricType({
      name: "Product Analytics & Adoption",
      whatAreThey: "These are behavioral metrics that track how users engage with our platform.",
      focus: "User behavior, product usability, and feature adoption.",
      whyTheyMatter: "They tell us if our digital products are intuitive, useful, and capable of sustaining engagement over time. They are crucial for product iteration.",
      keyQuestion: "Are teachers finding, using, and getting value from our digital tools?",
      primaryAudience: "Product team, Engineering, Design, DL team"
    }, creatorId);

    console.log(`  ✅ Created metric type: ${productAnalyticsType.name}`);

    // Metrics for Product Analytics
    await storage.createMetric({
      metricTypeId: productAnalyticsType.id,
      name: "Activation (First Action Rate)",
      definition: "The percentage of teachers who take their first meaningful action after accessing the feature.\n\nIt directly indicates the effectiveness of the onboarding process and the user's initial impression of the feature.",
      threshold: ""
    }, creatorId);
    console.log("  ✅ Created metric: Activation (First Action Rate)");

    await storage.createMetric({
      metricTypeId: productAnalyticsType.id,
      name: "Engagement (DAU/WAU/MAU)",
      definition: "",
      threshold: ""
    }, creatorId);
    console.log("  ✅ Created metric: Engagement (DAU/WAU/MAU)");

    await storage.createMetric({
      metricTypeId: productAnalyticsType.id,
      name: "Feature Retention (D7, D30)",
      definition: "",
      threshold: ""
    }, creatorId);
    console.log("  ✅ Created metric: Feature Retention (D7, D30)");

    console.log("\n🎉 Metric definitions seed completed successfully!");
    console.log(`\n📈 Summary:`);
    console.log(`   - Metric Types: 2`);
    console.log(`   - Total Metrics: 6`);

  } catch (error: any) {
    console.error("❌ Error seeding metric definitions:", error);
    throw error;
  }
}

// Run the seed script
seedMetricDefinitions()
  .then(() => {
    console.log("\n✅ Seed script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed script failed:", error);
    process.exit(1);
  });

