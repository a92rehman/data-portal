import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertDataRequestSchema, insertCommentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Data request routes
  app.post('/api/requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertDataRequestSchema.parse(req.body);
      
      const request = await storage.createDataRequest(validatedData, userId);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating request:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create request" });
      }
    }
  });

  app.get('/api/requests', isAuthenticated, async (req: any, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        department: req.query.department as string,
        priority: req.query.priority as string,
        type: req.query.type as string,
        requestedById: req.query.requestedById as string,
        assignedToId: req.query.assignedToId as string,
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (!filters[key as keyof typeof filters]) {
          delete filters[key as keyof typeof filters];
        }
      });

      const requests = await storage.getDataRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.get('/api/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const request = await storage.getDataRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching request:", error);
      res.status(500).json({ message: "Failed to fetch request" });
    }
  });

  app.patch('/api/requests/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'data_analyst') {
        return res.status(403).json({ message: "Only data analysts can update request status" });
      }

      const { status, estimatedDays } = req.body;
      const request = await storage.updateDataRequestStatus(req.params.id, status, estimatedDays);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error updating request status:", error);
      res.status(500).json({ message: "Failed to update request status" });
    }
  });

  app.patch('/api/requests/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'data_analyst') {
        return res.status(403).json({ message: "Only data analysts can assign requests" });
      }

      const { analystId } = req.body;
      const request = await storage.assignDataRequest(req.params.id, analystId);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error assigning request:", error);
      res.status(500).json({ message: "Failed to assign request" });
    }
  });

  // Comment routes
  app.post('/api/requests/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCommentSchema.parse({
        ...req.body,
        requestId: req.params.id,
      });
      
      const comment = await storage.addComment(validatedData, userId);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error adding comment:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to add comment" });
      }
    }
  });

  // Analytics routes
  app.get('/api/analytics/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getRequestStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/analytics/departments', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getDepartmentStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching department stats:", error);
      res.status(500).json({ message: "Failed to fetch department stats" });
    }
  });

  app.get('/api/analytics/types', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getTypeStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching type stats:", error);
      res.status(500).json({ message: "Failed to fetch type stats" });
    }
  });

  app.get('/api/analytics/priorities', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getPriorityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching priority stats:", error);
      res.status(500).json({ message: "Failed to fetch priority stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
