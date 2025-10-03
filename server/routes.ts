import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertDataRequestSchema, insertCommentSchema, insertAttachmentSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { sendAssignmentEmail } from "./emailService";
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

  app.get('/api/users/analysts', isAuthenticated, async (req: any, res) => {
    try {
      const analysts = await storage.getDataAnalysts();
      res.json(analysts);
    } catch (error) {
      console.error("Error fetching analysts:", error);
      res.status(500).json({ message: "Failed to fetch analysts" });
    }
  });

  app.patch('/api/auth/user/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role } = req.body;
      
      if (!role || (role !== 'data_analyst' && role !== 'team_lead')) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.upsertUser({
        ...user,
        role: role as "data_analyst" | "team_lead",
        department: user.department || "engineering",
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/auth/user/department', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { department } = req.body;
      
      if (!department) {
        return res.status(400).json({ message: "Department is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.upsertUser({
        ...user,
        department,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user department:", error);
      res.status(500).json({ message: "Failed to update user department" });
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const filters = {
        status: req.query.status as string,
        department: req.query.department as string,
        priority: req.query.priority as string,
        type: req.query.type as string,
        requestedById: req.query.requestedById as string,
        assignedToId: req.query.assignedToId as string,
      };

      // If user is a team lead, they can only see their own requests
      if (user?.role === 'team_lead') {
        filters.requestedById = userId;
      }

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

      // Send email notification to assigned analyst
      try {
        const assignedAnalyst = await storage.getUser(analystId);
        if (assignedAnalyst && assignedAnalyst.email) {
          const dueDateString = request.dueDate 
            ? new Date(request.dueDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) 
            : 'Not set';
          
          await sendAssignmentEmail({
            assigneeName: `${assignedAnalyst.firstName || ''} ${assignedAnalyst.lastName || ''}`.trim() || assignedAnalyst.email,
            assigneeEmail: assignedAnalyst.email,
            taskTitle: request.title,
            taskDescription: request.description,
            taskId: request.id,
            dueDate: dueDateString,
            priority: request.priority,
            assignerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '',
            department: request.department,
          });
          console.log(`[email] Assignment notification sent to ${assignedAnalyst.email}`);
        }
      } catch (emailError) {
        console.error("[email] Failed to send assignment notification:", emailError);
        // Don't fail the request if email fails
      }

      res.json(request);
    } catch (error) {
      console.error("Error assigning request:", error);
      res.status(500).json({ message: "Failed to assign request" });
    }
  });

  app.patch('/api/requests/:id/priority-deadline', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'data_analyst') {
        return res.status(403).json({ message: "Only data analysts can update priority and deadline" });
      }

      const { priority, dueDate } = req.body;
      if (!priority || !dueDate) {
        return res.status(400).json({ message: "Priority and due date are required" });
      }

      const request = await storage.updateDataRequestPriorityAndDeadline(
        req.params.id, 
        priority, 
        new Date(dueDate)
      );
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error updating priority and deadline:", error);
      res.status(500).json({ message: "Failed to update priority and deadline" });
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

  // Object storage routes
  app.post('/api/objects/upload', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestId = req.body.requestId;
      
      if (!requestId) {
        return res.status(400).json({ message: "Request ID is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const result = await objectStorageService.getObjectEntityUploadURL(userId, requestId);
      res.json(result);
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post('/api/requests/:id/attachments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestId = req.params.id;
      const uploadToken = req.body.uploadToken;
      
      if (!uploadToken) {
        return res.status(400).json({ message: "Upload token is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.validateAndConsumeUploadToken(uploadToken, userId, requestId);
      
      const validatedData = insertAttachmentSchema.parse({
        requestId,
        fileName: req.body.fileName,
        filePath: objectPath,
        fileSize: req.body.fileSize,
        mimeType: req.body.mimeType,
      });
      
      const attachment = await storage.addAttachment(validatedData, userId);
      res.status(201).json(attachment);
    } catch (error) {
      console.error("Error adding attachment:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid attachment data", errors: error.errors });
      } else if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to add attachment" });
      }
    }
  });

  app.get('/objects/:objectPath(*)', isAuthenticated, async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    const userId = req.user.claims.sub;
    
    try {
      const objectPath = req.path;
      
      const attachment = await storage.getAttachmentByFilePath(objectPath);
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      const request = await storage.getDataRequest(attachment.requestId);
      if (!request) {
        return res.status(404).json({ message: "Associated request not found" });
      }
      
      const isRequester = request.requestedById === userId;
      const isAssignee = request.assignedToId === userId || request.assignedTo?.id === userId;
      const isDataAnalyst = req.user.claims.role === "data_analyst";
      
      if (!isRequester && !isAssignee && !isDataAnalyst) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
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

  // Admin route to purge all requests
  app.post('/api/admin/purge-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'data_analyst') {
        return res.status(403).json({ message: "Unauthorized - admin only" });
      }

      const result = await storage.purgeAllRequests();
      res.json(result);
    } catch (error) {
      console.error("Error purging requests:", error);
      res.status(500).json({ message: "Failed to purge requests" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
