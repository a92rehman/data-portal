import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { generateEmbedToken } from './powerbiService';

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Request timeout middleware - prevents hanging requests
app.use((req, res, next) => {
  // Set timeout for all requests to prevent hanging
  const timeout = 60000; // 60 seconds default
  const reqTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.warn(`[TIMEOUT] Request ${req.method} ${req.path} timed out after ${timeout}ms`);
      res.status(504).json({ message: 'Request timeout' });
    }
  }, timeout);

  // Clear timeout when response finishes
  res.on('finish', () => clearTimeout(reqTimeout));
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run database migrations before setting up routes
  try {
    const { setupSessionTable } = await import('./migrations/setup-session-table');
    await setupSessionTable();
  } catch (error) {
    console.error('[Migration] Failed to setup session table:', error);
  }

  const server = await registerRoutes(app);

  // Run additional migrations
  try {
    const { setupDataLead } = await import('./migrations/setup-data-lead');
    await setupDataLead();
  } catch (error) {
    console.error('[Migration] Failed to setup Data Lead:', error);
  }

  // Run metric definitions migrations
  try {
    console.log('[Migration] Running metric definitions migrations...');
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const { sql } = await import('drizzle-orm');
    const { db } = await import('./db.js');
    
    // Run metric_types and metrics migration
    const metricDefsSQL = readFileSync(
      join(process.cwd(), 'migrations', 'create_metric_definitions.sql'),
      'utf-8'
    );
    const cleanMetricDefsSQL = metricDefsSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    if (cleanMetricDefsSQL) {
      await db.execute(sql.raw(cleanMetricDefsSQL));
      console.log('[Migration] ✅ Metric definitions tables created/verified');
    }

    // Run metric_features migration
    const metricFeaturesSQL = readFileSync(
      join(process.cwd(), 'migrations', 'add_metric_features.sql'),
      'utf-8'
    );
    const cleanMetricFeaturesSQL = metricFeaturesSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    if (cleanMetricFeaturesSQL) {
      await db.execute(sql.raw(cleanMetricFeaturesSQL));
      console.log('[Migration] ✅ Metric features table created/verified');
    }
  } catch (error: any) {
    console.error('[Migration] Failed to setup metric definitions:', error);
    // Don't throw - allow server to start even if migrations fail
  }

  // Seed metric definitions if tables are empty
  try {
    console.log('[Migration] Checking if metric definitions need seeding...');
    const { storage } = await import('./storage.js');
    const metricTypes = await storage.getAllMetricTypes();
    
    if (metricTypes.length === 0) {
      console.log('[Migration] No metric definitions found. Seeding initial data...');
      const { db } = await import('./db.js');
      const { users } = await import('../shared/schema.js');
      const { eq } = await import('drizzle-orm');
      
      // Find a team lead user to use as creator
      const teamLeads = await db.select().from(users).where(eq(users.role, 'team_lead')).limit(1);
      let creatorId: string;
      
      if (teamLeads.length > 0) {
        creatorId = teamLeads[0].id;
      } else {
        const allUsers = await db.select().from(users).limit(1);
        if (allUsers.length === 0) {
          console.log('[Migration] ⚠️  No users found. Skipping seed (will seed when user exists)');
        } else {
          creatorId = allUsers[0].id;
          console.log('[Migration] ⚠️  No team lead found. Using first user as creator');
        }
      }

      if (creatorId) {
        // Metric Type 1: Program Delivery & Implementation Metrics
        const programDeliveryType = await storage.createMetricType({
          name: "Program Delivery & Implementation Metrics",
          whatAreThey: "These are process-oriented metrics that track the on-the-ground execution of the Taleemabad model. They are leading indicators of potential impact.",
          focus: "Quantity, Quality, and Consistency of service delivery.",
          whyTheyMatter: "They ensure the program is being implemented with fidelity, which is a prerequisite for achieving outcomes.",
          keyQuestion: "Are we delivering our program to schools and teachers as planned and with quality?",
          primaryAudience: "Program Coordinator, Program Manager, PAFM, RMs, Coaches"
        }, creatorId);

        await storage.createMetric({
          metricTypeId: programDeliveryType.id,
          name: "Successful Coach Visit",
          definition: "A visit where the coach: (1) Visits the school, (2) Observes the class, and (3) Provides feedback.\n\nIt ensures the quality and completion of the coaching feedback loop.",
          threshold: "100% visits should be successful"
        }, creatorId);

        await storage.createMetric({
          metricTypeId: programDeliveryType.id,
          name: "Lesson Plan Fidelity",
          definition: "The degree to which teachers deliver lesson plans as intended, adhering to content, pedagogy, and pacing.\n\nIt measures teaching effectiveness and alignment with the intended learning model.",
          threshold: "LP fidelity score should be more than 60%"
        }, creatorId);

        await storage.createMetric({
          metricTypeId: programDeliveryType.id,
          name: "Training Completion Rate",
          definition: "Measures the uptake of professional development.\n\nTeacher capacity building is critical for sustaining improvements in pedagogy.",
          threshold: "The target of training engagement metrics will vary across 4 training levels (L0-L3), and will be the same as the percentage of teachers who need to complete each level of training, with targets of 90% for L0 and L1, 50% for L2, and 30% for L3.\n\nWe set our benchmarks at 90–50–30 so that we build a pyramid of teacher expertise. Almost all teachers (90%) build the basics, half (50%) deepen their practice, and about a third (30% = 1,200 teachers) reach coach level. This structure ensures we have enough skilled coaches to support the system, while still keeping targets realistic."
        }, creatorId);

        // Metric Type 2: Product Analytics & Adoption
        const productAnalyticsType = await storage.createMetricType({
          name: "Product Analytics & Adoption",
          whatAreThey: "These are behavioral metrics that track how users engage with our platform.",
          focus: "User behavior, product usability, and feature adoption.",
          whyTheyMatter: "They tell us if our digital products are intuitive, useful, and capable of sustaining engagement over time. They are crucial for product iteration.",
          keyQuestion: "Are teachers finding, using, and getting value from our digital tools?",
          primaryAudience: "Product team, Engineering, Design, DL team"
        }, creatorId);

        await storage.createMetric({
          metricTypeId: productAnalyticsType.id,
          name: "Activation (First Action Rate)",
          definition: "The percentage of teachers who take their first meaningful action after accessing the feature.\n\nIt directly indicates the effectiveness of the onboarding process and the user's initial impression of the feature.",
          threshold: ""
        }, creatorId);

        await storage.createMetric({
          metricTypeId: productAnalyticsType.id,
          name: "Engagement (DAU/WAU/MAU)",
          definition: "",
          threshold: ""
        }, creatorId);

        await storage.createMetric({
          metricTypeId: productAnalyticsType.id,
          name: "Feature Retention (D7, D30)",
          definition: "",
          threshold: ""
        }, creatorId);

        console.log('[Migration] ✅ Metric definitions seeded successfully');
      }
    } else {
      console.log(`[Migration] ✅ Metric definitions already exist (${metricTypes.length} types found)`);
    }
  } catch (error: any) {
    console.error('[Migration] Failed to seed metric definitions:', error);
    // Don't throw - allow server to start even if seeding fails
  }

  // Health check endpoint - simple connection test
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Ensure API routes are registered and matched BEFORE Vite middleware
  // The Power BI embed token route is already registered above (before registerRoutes)
  // All other API routes are registered in registerRoutes()
  // Now set up Vite middleware - it will skip /api/* routes
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
