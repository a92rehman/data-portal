import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { generateEmbedToken, extractAllVisualsData, storeVisualData, clearExpiredVisualData } from './powerbiService';

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

  // Run SQL migrations
  try {
    console.log('[Migration] Running SQL migrations...');
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const { sql } = await import('drizzle-orm');
    const { db } = await import('./db.js');

    const runMigration = async (filename: string, label: string) => {
      const raw = readFileSync(join(process.cwd(), 'migrations', filename), 'utf-8');
      const cleaned = raw.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim();
      if (cleaned) {
        await db.execute(sql.raw(cleaned));
        console.log(`[Migration] ${label}`);
      }
    };

    await runMigration('create_metric_definitions.sql', 'Metric definitions tables created/verified');
    await runMigration('add_metric_features.sql', 'Metric features table created/verified');
    await runMigration('add_metric_detail_body.sql', 'Metric detail body column created/verified');
    await runMigration('add_task_blocking_reason.sql', 'Task blocking_reason column created/verified');
    await runMigration('add_notification_task_id.sql', 'Notification task_id column created/verified');
    await runMigration('create_powerbi_visual_data.sql', 'Power BI visual data table created/verified');
  } catch (error: any) {
    console.error('[Migration] Failed to run SQL migrations:', error);
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
      let creatorId: string | undefined;

      if (teamLeads.length > 0) {
        creatorId = teamLeads[0].id;
      } else {
        const allUsers = await db.select().from(users).limit(1);
        if (allUsers.length === 0) {
          console.log('[Migration] No users found. Skipping seed (will seed when user exists)');
        } else {
          creatorId = allUsers[0].id;
          console.log('[Migration] No team lead found. Using first user as creator');
        }
      }

      if (creatorId) {
        // Metric Type 1: Program Delivery & Implementation Metrics
        const programDeliveryType = await storage.createMetricType({
          name: "Program Delivery & Implementation Metrics",
          whatAreThey: "These are process-oriented metrics that track the on-the-ground execution of the program model. They are leading indicators of potential impact.",
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

  // Set up periodic refresh job for Power BI visual data
  // Refresh interval: 15 minutes (configurable via env var)
  const refreshIntervalMs = parseInt(process.env.POWERBI_VISUAL_REFRESH_INTERVAL_MS || '900000', 10); // 15 min default
  
  // Get list of reports to refresh from environment or use default
  const reportsToRefresh: string[] = process.env.POWERBI_REPORTS_TO_REFRESH
    ? process.env.POWERBI_REPORTS_TO_REFRESH.split(',').map(r => r.trim()).filter(r => r)
    : [];
  
  if (reportsToRefresh.length > 0 || process.env.POWERBI_DATASET_ID) {
    console.log('[POWERBI REFRESH] Setting up periodic refresh job');
    console.log('[POWERBI REFRESH] Refresh interval:', refreshIntervalMs / 1000, 'seconds');
    console.log('[POWERBI REFRESH] Reports to refresh:', reportsToRefresh.length > 0 ? reportsToRefresh.join(', ') : 'Will extract from active reports');
    
    // Function to refresh visual data for all tracked reports
    const refreshVisualData = async () => {
      try {
        console.log('[POWERBI REFRESH] Starting periodic visual data refresh...');
        
        // Clear expired data first
        await clearExpiredVisualData();
        
        // If specific reports are configured, refresh those
        if (reportsToRefresh.length > 0) {
          for (const reportId of reportsToRefresh) {
            try {
              console.log('[POWERBI REFRESH] Refreshing visual data for report:', reportId);
              const visualData = await extractAllVisualsData(reportId);
              await storeVisualData(reportId, visualData);
              console.log('[POWERBI REFRESH] ✅ Refreshed', visualData.visuals.length, 'visuals for report:', reportId);
            } catch (error: any) {
              console.error('[POWERBI REFRESH] ❌ Failed to refresh report', reportId, ':', error.message);
            }
          }
        } else {
          // If no specific reports configured, try to get reports from database
          // For now, we'll skip this and only refresh when reports are explicitly configured
          // or when extraction is triggered manually via API
          console.log('[POWERBI REFRESH] No reports configured for automatic refresh. Use POWERBI_REPORTS_TO_REFRESH env var to enable.');
        }
        
        console.log('[POWERBI REFRESH] Periodic refresh completed');
      } catch (error: any) {
        console.error('[POWERBI REFRESH] Error in periodic refresh:', error);
      }
    };
    
    // Run initial refresh after 1 minute (to let server fully start)
    setTimeout(() => {
      refreshVisualData().catch(console.error);
    }, 60000);
    
    // Set up interval for periodic refresh
    setInterval(() => {
      refreshVisualData().catch(console.error);
    }, refreshIntervalMs);
    
    console.log('[POWERBI REFRESH] ✅ Periodic refresh job configured');
  } else {
    console.log('[POWERBI REFRESH] No reports configured for automatic refresh. Set POWERBI_REPORTS_TO_REFRESH env var to enable.');
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error handler MUST be registered after all routes and Vite middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[ERROR] ${status}: ${message}`, err.stack);
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

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
