import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
import { insertDataRequestSchema, insertCommentSchema, insertAttachmentSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { sendAssignmentEmail, sendRequestAcceptedEmail, sendRequestRejectedEmail, sendTeamMemberInviteEmail, sendAnalystPasswordSetupEmail } from "./emailService";
import { randomBytes } from "crypto";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Data Lead can view all users" });
      }
      
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Data Lead can update user roles" });
      }

      const { role, department } = req.body;
      
      if (!role || !['requester', 'team_lead', 'analyst'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const targetUser = await storage.getUser(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // SECURITY: Protect primary data lead - role cannot be changed
      const PRIMARY_DATA_LEAD_EMAIL = 'abdur.rehman@taleemabad.com';
      if (targetUser.email?.toLowerCase() === PRIMARY_DATA_LEAD_EMAIL) {
        return res.status(403).json({ 
          message: "Primary Data Lead role cannot be changed" 
        });
      }

      // Email validation: Requesters can only use company email
      if (role === 'requester') {
        const email = targetUser.email || '';
        const allowedDomains = ['@taleemabad.com', '@niete.edu.pk'];
        const hasValidDomain = allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
        
        if (!hasValidDomain) {
          return res.status(403).json({ 
            message: "Requesters must use a company email address (@taleemabad.com or @niete.edu.pk)" 
          });
        }
      }

      const updatedUser = await storage.updateUserRole(req.params.userId, role, department);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Data Lead can remove users" });
      }

      // Prevent self-deletion
      if (req.params.userId === req.user.id) {
        return res.status(400).json({ message: "Cannot remove yourself" });
      }

      // SECURITY: Protect primary data lead - cannot be removed
      const targetUser = await storage.getUser(req.params.userId);
      const PRIMARY_DATA_LEAD_EMAIL = 'abdur.rehman@taleemabad.com';
      if (targetUser?.email?.toLowerCase() === PRIMARY_DATA_LEAD_EMAIL) {
        return res.status(403).json({ 
          message: "Primary Data Lead cannot be removed" 
        });
      }

      await storage.deleteUser(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing user:", error);
      res.status(500).json({ message: "Failed to remove user" });
    }
  });

  app.post('/api/users/invite', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Data Lead can invite team members" });
      }

      const { email, role, department } = req.body;
      
      if (!email || !role || !['requester', 'team_lead', 'analyst'].includes(role)) {
        return res.status(400).json({ message: "Invalid email or role" });
      }

      // SECURITY: Protect primary data lead - cannot invite or change via this endpoint
      const PRIMARY_DATA_LEAD_EMAIL = 'abdur.rehman@taleemabad.com';
      if (email.toLowerCase() === PRIMARY_DATA_LEAD_EMAIL) {
        return res.status(403).json({ 
          message: "Primary Data Lead role cannot be changed" 
        });
      }

      // Email validation: Requesters must use company email
      if (role === 'requester') {
        const allowedDomains = ['@taleemabad.com', '@niete.edu.pk'];
        const hasValidDomain = allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
        
        if (!hasValidDomain) {
          return res.status(403).json({ 
            message: "Requesters must use a company email address (@taleemabad.com or @niete.edu.pk)" 
          });
        }
      }

      // Create or update user with the invited role
      const existingUser = await storage.getUserByEmail(email);
      
      let resultUser;
      if (existingUser) {
        // Update existing user's role
        resultUser = await storage.updateUserRole(existingUser.id, role, department);
      } else {
        // Create placeholder user that will be populated on first login
        resultUser = await storage.createInvitedUser(email, role, department);
      }

      // For analysts, generate password setup token and send setup email
      if (role === 'analyst' && !existingUser) {
        try {
          const inviterName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'Data Lead';
          
          // Generate password reset token
          const resetToken = randomBytes(32).toString('hex');
          const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
          
          // Store token in user record
          await storage.updatePasswordResetToken(resultUser.id, resetToken, resetExpires);
          
          // Get app URL from environment or construct from request
          const appUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
            : `${req.protocol}://${req.get('host')}`;
          
          // Send password setup email
          await sendAnalystPasswordSetupEmail({
            analystName: email.split('@')[0], // Use email username as name placeholder
            analystEmail: email,
            setupToken: resetToken,
            inviterName,
            appUrl,
          });
          console.log(`[email] Password setup email sent successfully to ${email}`);
        } catch (emailError) {
          console.error("[email] Failed to send password setup email:", emailError);
          // Don't fail the request if email fails
        }
      } else {
        // For requesters and team leads, send regular invitation email
        try {
          const inviterName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'Data Lead';
          
          await sendTeamMemberInviteEmail({
            inviteeName: email.split('@')[0], // Use email username as name placeholder
            inviteeEmail: email,
            role,
            department: department || 'Not specified',
            inviterName,
          });
          console.log(`[email] Invitation email sent successfully to ${email}`);
        } catch (emailError) {
          console.error("[email] Failed to send invitation email:", emailError);
          // Don't fail the request if email fails
        }
      }

      res.status(existingUser ? 200 : 201).json(resultUser);
    } catch (error) {
      console.error("Error inviting team member:", error);
      res.status(500).json({ message: "Failed to invite team member" });
    }
  });

  app.patch('/api/auth/user/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { role } = req.body;
      
      if (!role || !['requester', 'team_lead', 'analyst'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // SECURITY: Prevent privilege escalation
      // If user already has a role, they can only re-select the SAME role (re-authentication)
      if (user.role && user.role !== role) {
        // Trying to change to a different role - must be changed by Data Lead
        return res.status(403).json({ 
          message: "You have already been assigned a role. Contact Data Lead to change it." 
        });
      }

      // If user already has their role, just confirm it (re-authentication flow)
      if (user.role === role) {
        return res.json({ success: true });
      }

      // SECURITY: Bootstrap Data Lead - only abdur.rehman@taleemabad.com can self-select team_lead
      // Others can only become team_lead through team management
      if (role === 'team_lead') {
        const isBootstrapEmail = user.email?.toLowerCase() === 'abdur.rehman@taleemabad.com';
        
        if (!isBootstrapEmail) {
          return res.status(403).json({ 
            message: "Team Lead role can only be assigned by an existing Data Lead. Please contact support or sign in as Data Requester." 
          });
        }
      }

      // Email validation: Requesters can only use company email
      if (role === 'requester') {
        const email = user.email || '';
        const allowedDomains = ['@taleemabad.com', '@niete.edu.pk'];
        const hasValidDomain = allowedDomains.some(domain => email.toLowerCase().endsWith(domain));
        
        if (!hasValidDomain) {
          return res.status(403).json({ 
            message: "Requesters must use a company email address (@taleemabad.com or @niete.edu.pk)" 
          });
        }
      }

      // For analysts signing in, they must have been invited first
      if (role === 'analyst' && !user.role) {
        return res.status(403).json({ 
          message: "Data Analysts must be invited by a Data Lead before signing in." 
        });
      }

      await storage.upsertUser({
        ...user,
        role: role as "requester" | "team_lead" | "analyst",
        department: user.department || null,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/auth/user/department', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Start with query filters (for status, department, priority, type only)
      const filters = {
        status: req.query.status as string,
        department: req.query.department as string,
        priority: req.query.priority as string,
        type: req.query.type as string,
        requestedById: undefined as string | undefined,
        assignedToId: undefined as string | undefined,
      };

      // CRITICAL: Role-based filtering - ALWAYS enforce based on user role
      // Ignore any requestedById/assignedToId from query params - we set them based on role
      if (user.role === 'requester') {
        // Requesters can ONLY see their own requests
        filters.requestedById = userId;
        filters.assignedToId = undefined; // Clear any passed assignedToId
      } else if (user.role === 'analyst') {
        // Analysts can ONLY see requests assigned to them
        filters.assignedToId = userId;
        filters.requestedById = undefined; // Clear any passed requestedById
      } else if (user.role === 'team_lead') {
        // Team leads see all requests - allow optional filters from query
        if (req.query.requestedById) {
          filters.requestedById = req.query.requestedById as string;
        }
        if (req.query.assignedToId) {
          filters.assignedToId = req.query.assignedToId as string;
        }
      } else {
        // Security: Deny access to users without a recognized role
        console.warn(`User ${userId} attempted to access requests with invalid/missing role: ${user.role}`);
        return res.status(403).json({ 
          message: "Access denied. Please complete your profile setup or contact an administrator." 
        });
      }

      // Remove undefined/empty filters
      Object.keys(filters).forEach(key => {
        const value = filters[key as keyof typeof filters];
        if (!value || value === '') {
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
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'analyst') {
        return res.status(403).json({ message: "Only analysts can update request status" });
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
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Data Lead can assign requests" });
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
            taskDescription: request.primaryQuestion || request.title,
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
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Data Lead can update priority and deadline" });
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

  app.delete('/api/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'analyst') {
        return res.status(403).json({ message: "Only analysts can delete requests" });
      }

      await storage.deleteDataRequest(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting request:", error);
      res.status(500).json({ message: "Failed to delete request" });
    }
  });

  // New workflow routes for three-role system
  app.patch('/api/requests/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Data Lead can accept requests" });
      }

      const request = await storage.acceptRequest(req.params.id, user.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error accepting request:", error);
      res.status(500).json({ message: "Failed to accept request" });
    }
  });

  app.patch('/api/requests/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      // Both Data Lead and Analyst can reject requests
      if (!user || !['team_lead', 'analyst'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { rejectionReason } = req.body;
      if (!rejectionReason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      // For analysts, verify they're assigned to this request
      if (user.role === 'analyst') {
        const requestDetails = await storage.getDataRequest(req.params.id);
        if (!requestDetails || requestDetails.assignedToId !== user.id) {
          return res.status(403).json({ message: "You can only reject requests assigned to you" });
        }
      }

      const request = await storage.rejectRequest(req.params.id, user.id, rejectionReason);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Get requester details for email and notification
      const requester = await storage.getUser(request.requestedById);
      
      // Send email to requester
      if (requester && requester.email) {
        try {
          await sendRequestRejectedEmail({
            requesterName: `${requester.firstName || ''} ${requester.lastName || ''}`.trim() || requester.email,
            requesterEmail: requester.email,
            taskTitle: request.title,
            rejectionReason,
            rejectedBy: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '',
            department: request.department,
          });
        } catch (emailError) {
          console.error('[email] Failed to send rejection email:', emailError);
        }
      }

      // Create notification for requester
      if (requester) {
        try {
          await storage.createNotification({
            userId: requester.id,
            type: 'request_rejected',
            title: 'Request Update Required',
            message: `Your request "${request.title}" requires modifications. Feedback: ${rejectionReason}`,
            requestId: request.id,
            read: 'false',
          });
        } catch (notifError) {
          console.error('[notification] Failed to create notification:', notifError);
        }
      }

      // If analyst rejected, notify Data Lead
      if (user.role === 'analyst' && request.reviewedById) {
        try {
          const dataLead = await storage.getUser(request.reviewedById);
          if (dataLead) {
            await storage.createNotification({
              userId: dataLead.id,
              type: 'analyst_rejected_request',
              title: 'Analyst Rejected Request',
              message: `${user.firstName || user.email} rejected request "${request.title}". Reason: ${rejectionReason}`,
              requestId: request.id,
              read: 'false',
            });
          }
        } catch (notifError) {
          console.error('[notification] Failed to create Data Lead notification:', notifError);
        }
      }

      res.json(request);
    } catch (error) {
      console.error("Error rejecting request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  app.patch('/api/requests/:id/assign-analyst', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Data Lead can assign analysts" });
      }

      const { analystId, dueDate } = req.body;
      if (!analystId) {
        return res.status(400).json({ message: "Analyst ID is required" });
      }

      const request = await storage.assignToAnalyst(req.params.id, analystId, dueDate ? new Date(dueDate) : undefined);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      const assignedAnalyst = await storage.getUser(analystId);
      const requester = await storage.getUser(request.requestedById);
      
      const dueDateString = request.dueDate 
        ? new Date(request.dueDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) 
        : 'Not set';

      // Send email notification to assigned analyst
      if (assignedAnalyst && assignedAnalyst.email) {
        try {
          await sendAssignmentEmail({
            assigneeName: `${assignedAnalyst.firstName || ''} ${assignedAnalyst.lastName || ''}`.trim() || assignedAnalyst.email,
            assigneeEmail: assignedAnalyst.email,
            taskTitle: request.title,
            taskDescription: request.primaryQuestion || '',
            taskId: request.id,
            dueDate: dueDateString,
            priority: request.priority,
            assignerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '',
            department: request.department,
          });
          console.log(`[email] Assignment notification sent to ${assignedAnalyst.email}`);
        } catch (emailError) {
          console.error("[email] Failed to send assignment notification:", emailError);
        }

        // Create notification for analyst
        try {
          await storage.createNotification({
            userId: assignedAnalyst.id,
            type: 'request_assigned',
            title: 'New Task Assignment',
            message: `You have been assigned to work on "${request.title}"`,
            requestId: request.id,
            read: 'false',
          });
        } catch (notifError) {
          console.error('[notification] Failed to create analyst notification:', notifError);
        }
      }

      // Send email notification to requester
      if (requester && requester.email) {
        try {
          await sendRequestAcceptedEmail({
            requesterName: `${requester.firstName || ''} ${requester.lastName || ''}`.trim() || requester.email,
            requesterEmail: requester.email,
            taskTitle: request.title,
            analystName: `${assignedAnalyst?.firstName || ''} ${assignedAnalyst?.lastName || ''}`.trim() || assignedAnalyst?.email || 'an analyst',
            dueDate: dueDateString,
            priority: request.priority,
            department: request.department,
          });
          console.log(`[email] Acceptance notification sent to ${requester.email}`);
        } catch (emailError) {
          console.error("[email] Failed to send acceptance notification:", emailError);
        }

        // Create notification for requester
        try {
          await storage.createNotification({
            userId: requester.id,
            type: 'request_accepted',
            title: 'Request Accepted',
            message: `Your request "${request.title}" has been accepted and assigned to ${assignedAnalyst?.firstName || assignedAnalyst?.email || 'an analyst'}`,
            requestId: request.id,
            read: 'false',
          });
        } catch (notifError) {
          console.error('[notification] Failed to create requester notification:', notifError);
        }
      }

      res.json(request);
    } catch (error) {
      console.error("Error assigning analyst:", error);
      res.status(500).json({ message: "Failed to assign analyst" });
    }
  });

  app.post('/api/requests/:id/blockers', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'analyst') {
        return res.status(403).json({ message: "Only analysts can add blockers" });
      }

      const { description } = req.body;
      if (!description) {
        return res.status(400).json({ message: "Blocker description is required" });
      }

      const blocker = await storage.addBlocker(req.params.id, description, user.id);
      
      if (!blocker) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.status(201).json(blocker);
    } catch (error) {
      console.error("Error adding blocker:", error);
      res.status(500).json({ message: "Failed to add blocker" });
    }
  });

  app.patch('/api/requests/:id/suggest-deadline', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'analyst') {
        return res.status(403).json({ message: "Only analysts can suggest deadlines" });
      }

      const { suggestedDeadline } = req.body;
      if (!suggestedDeadline) {
        return res.status(400).json({ message: "Suggested deadline is required" });
      }

      const request = await storage.suggestDeadline(req.params.id, new Date(suggestedDeadline));
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error suggesting deadline:", error);
      res.status(500).json({ message: "Failed to suggest deadline" });
    }
  });

  // Comment routes
  app.post('/api/requests/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
    const userId = req.user.id;
    
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
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      // Role-based stats filtering:
      // - Requesters see stats for their own requests only
      // - Analysts see stats for requests assigned to them only
      // - Team leads see stats for all requests
      const stats = await storage.getRequestStats(userId, user?.role);
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

  // Auth logs - restricted to Data Lead only
  app.get('/api/auth-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'team_lead') {
        return res.status(403).json({ message: "Access denied. Only Data Lead can view auth logs." });
      }
      
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getRecentAuthLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching auth logs:", error);
      res.status(500).json({ message: "Failed to fetch auth logs" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const unreadOnly = req.query.unreadOnly === 'true';
      
      const notifications = await storage.getUserNotifications(userId, unreadOnly);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Admin route to purge all requests
  app.post('/api/admin/purge-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
