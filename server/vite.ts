import express, { type Express } from "express";
import fs from "fs";
import { resolve } from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    // Disable HMR completely to prevent WebSocket errors that interfere with PowerBI iframe
    // HMR causes localhost:undefined errors in the client bundle
    hmr: false,
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Only apply Vite middleware to non-API routes
  // CRITICAL: This MUST run AFTER all Express routes are registered
  // Express routes (app.get(), app.post(), etc.) are checked BEFORE middleware
  // But we add a check here as a safety measure
  app.use((req, res, next) => {
    // CRITICAL: Skip Vite middleware for ALL API routes - let Express routes handle them
    // Check both req.path and req.originalUrl to be safe
    const requestPath = req.path || '';
    const originalUrl = req.originalUrl || '';
    const isApiRoute = requestPath.startsWith('/api/') || originalUrl.startsWith('/api/');
    
    if (isApiRoute) {
      // API route - let Express routes handle it
      // If no route matches, it will fall through to the catch-all below
      return next();
    }
    // For all other routes, use Vite middleware
    vite.middlewares(req, res, next);
  });
  
  // Catch-all route for SPA - but ONLY for non-API routes
  // CRITICAL: This middleware MUST check for API routes and skip them
  // Express routes (registered with app.get(), etc.) should match first,
  // but this is a safety check to ensure we never serve HTML for API routes
  app.use("*", async (req, res, next) => {
    // CRITICAL: Skip API routes - they should have been handled by Express routes first
    // Check both req.path and req.originalUrl to be absolutely sure
    const requestPath = req.path || '';
    const originalUrl = req.originalUrl || '';
    const isApiRoute = requestPath.startsWith('/api/') || originalUrl.startsWith('/api/');
    
    if (isApiRoute) {
      // API route - if we got here, it means no Express route matched
      // This shouldn't happen, but if it does, return 404 JSON instead of HTML
      if (!res.headersSent) {
        console.warn('[VITE] API route not handled by Express:', originalUrl);
        res.status(404).setHeader('Content-Type', 'application/json').json({
          success: false,
          message: 'API endpoint not found',
          path: requestPath,
          originalUrl: originalUrl
        });
      }
      return; // Don't call next() - response already sent
    }
    
    const url = req.originalUrl;

    try {
      const clientTemplate = resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(resolve(distPath, "index.html"));
  });
}
