import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword, comparePasswords } from "./auth";
import { setupWebSocketServer, getWebSocketServer } from "./websocket";

// Test emails for testing purposes
const TEST_EMAILS = ["ar09info@gmail.com", "ar92info@gmail.com"];

// Helper function to check if an email is allowed for requesters
function isAllowedRequesterEmail(email: string): boolean {
  const lowerEmail = email.toLowerCase();
  const allowedDomains = ['@taleemabad.com', '@niete.edu.pk'];
  const hasValidDomain = allowedDomains.some(domain => lowerEmail.endsWith(domain));
  const isTestEmail = TEST_EMAILS.includes(lowerEmail);
  return hasValidDomain || isTestEmail;
}

// Middleware to check if user is authenticated
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
import { insertDataRequestSchema, insertCommentSchema, insertAttachmentSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { sendAssignmentEmail, sendRequestAcceptedEmail, sendRequestRejectedEmail, sendTeamMemberInviteEmail, sendAnalystPasswordSetupEmail, sendAnalystCredentialsViaEmailJS, sendPasswordResetEmail } from "./emailService";
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

      // Email validation: Requesters can only use company email or test emails
      if (role === 'requester') {
        const email = targetUser.email || '';
        
        if (!isAllowedRequesterEmail(email)) {
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

  app.patch('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Data Lead can update users" });
      }

      const { firstName, lastName, email, role, department } = req.body;
      
      const targetUser = await storage.getUser(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // SECURITY: Protect primary data lead - cannot be edited
      const PRIMARY_DATA_LEAD_EMAIL = 'abdur.rehman@taleemabad.com';
      if (targetUser.email?.toLowerCase() === PRIMARY_DATA_LEAD_EMAIL) {
        return res.status(403).json({ 
          message: "Primary Data Lead information cannot be modified" 
        });
      }

      // Validate firstName and lastName if provided
      if (firstName && !firstName.trim()) {
        return res.status(400).json({ message: "First name cannot be empty" });
      }
      if (lastName && !lastName.trim()) {
        return res.status(400).json({ message: "Last name cannot be empty" });
      }

      // Validate email if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: "Invalid email format" });
        }

        // Check if email is already taken by another user
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.params.userId) {
          return res.status(409).json({ message: "Email is already in use" });
        }
      }

      // Validate role if provided
      if (role && !['requester', 'team_lead', 'analyst'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Email validation: Requesters must use company email or test emails
      const finalEmail = email || targetUser.email;
      const finalRole = role || targetUser.role;
      if (finalRole === 'requester' && finalEmail) {
        if (!isAllowedRequesterEmail(finalEmail)) {
          return res.status(403).json({ 
            message: "Requesters must use a company email address (@taleemabad.com or @niete.edu.pk)" 
          });
        }
      }

      // Update user with all provided fields
      const updatedUser = await storage.upsertUser({
        ...targetUser,
        ...(firstName && { firstName: firstName.trim() }),
        ...(lastName && { lastName: lastName.trim() }),
        ...(email && { email }),
        ...(role && { role }),
        ...(department !== undefined && { department }),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
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

  // Get EmailJS configuration for frontend
  app.get('/api/emailjs-config', (req, res) => {
    res.json({
      serviceId: process.env.EMAILJS_SERVICE_ID || '',
      templateId: process.env.EMAILJS_TEMPLATE_ID || '',
      publicKey: process.env.EMAILJS_PUBLIC_KEY || ''
    });
  });

  app.post('/api/users/invite', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser || currentUser.role !== 'team_lead') {
        return res.status(403).json({ message: "Only Data Lead can invite team members" });
      }

      const { email, role, department, name } = req.body;
      
      if (!email || !role || !['requester', 'team_lead', 'analyst'].includes(role)) {
        return res.status(400).json({ message: "Invalid email or role" });
      }

      // Split name into first and last name if provided
      let firstName: string | undefined;
      let lastName: string | undefined;
      if (name && name.trim()) {
        const nameParts = name.trim().split(' ');
        firstName = nameParts[0];
        lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
      }

      // SECURITY: Protect primary data lead - cannot invite or change via this endpoint
      const PRIMARY_DATA_LEAD_EMAIL = 'abdur.rehman@taleemabad.com';
      if (email.toLowerCase() === PRIMARY_DATA_LEAD_EMAIL) {
        return res.status(403).json({ 
          message: "Primary Data Lead role cannot be changed" 
        });
      }

      // Email validation: Requesters must use company email or test emails
      if (role === 'requester') {
        if (!isAllowedRequesterEmail(email)) {
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
        resultUser = await storage.createInvitedUser(email, role, department, firstName, lastName);
      }

      let generatedPassword: string | undefined;
      
      // For analysts, generate random password
      if (role === 'analyst' && !existingUser && resultUser) {
        try {
          console.log(`[server] Step 1: Generating password for analyst ${email}`);
          
          // Generate random password (12 characters: letters, numbers, special chars)
          generatedPassword = randomBytes(9).toString('base64').slice(0, 12);
          console.log(`[server] Step 2: Password generated (length: ${generatedPassword.length})`);
          
          // Hash password using scrypt (same as auth.ts - format: hash.salt)
          const { scrypt } = await import('crypto');
          const { promisify } = await import('util');
          const scryptAsync = promisify(scrypt);
          
          const salt = randomBytes(16).toString('hex');
          const derivedKey = await scryptAsync(generatedPassword, salt, 64) as Buffer;
          const hashedPassword = `${derivedKey.toString('hex')}.${salt}`;
          console.log(`[server] Step 3: Password hashed successfully`);
          
          // Store hashed password for the analyst
          await storage.updateUserPassword(resultUser.id, hashedPassword);
          console.log(`[server] Step 4: Password stored in database for analyst ${email}`);
          console.log(`[server] Step 5: Returning password to frontend for EmailJS delivery`);
        } catch (error) {
          console.error("[server] Failed to generate analyst password:", error);
          // Don't fail the request if password generation fails
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

      // Return user data with password for analysts (so frontend can send email via EmailJS)
      const responseData = {
        ...resultUser,
        ...(generatedPassword && { generatedPassword })
      };
      
      console.log(`[server] Step 6: Sending response to frontend:`, {
        hasGeneratedPassword: !!generatedPassword,
        passwordLength: generatedPassword?.length,
        email: resultUser?.email,
        role: resultUser?.role
      });
      
      res.status(existingUser ? 200 : 201).json(responseData);
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

      // Email validation: Requesters can only use company email or test emails
      if (role === 'requester') {
        const email = user.email || '';
        
        if (!isAllowedRequesterEmail(email)) {
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

  app.patch('/api/auth/user/email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { email } = req.body;
      
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if email is already taken by another user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ message: "Email is already in use" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.upsertUser({
        ...user,
        email,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user email:", error);
      res.status(500).json({ message: "Failed to update user email" });
    }
  });

  app.patch('/api/auth/user/name', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName } = req.body;
      
      if (!firstName || !firstName.trim()) {
        return res.status(400).json({ message: "First name is required" });
      }

      if (!lastName || !lastName.trim()) {
        return res.status(400).json({ message: "Last name is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.upsertUser({
        ...user,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user name:", error);
      res.status(500).json({ message: "Failed to update user name" });
    }
  });

  app.patch('/api/auth/user/password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.upsertUser({
        ...user,
        password: hashedPassword,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user password:", error);
      res.status(500).json({ message: "Failed to update user password" });
    }
  });

  // Forgot password - request reset
  app.post('/api/auth/forgot-password', async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email.trim().toLowerCase());
      
      // Always return success (don't reveal if email exists - security best practice)
      if (!user) {
        console.log(`[forgot-password] User not found for email: ${email}`);
        return res.json({ success: true, message: "If an account exists with this email, you will receive a password reset link" });
      }

      // Rate limiting: Check if user has requested reset in last hour
      if (user.passwordResetExpires && new Date(user.passwordResetExpires) > new Date()) {
        const minutesRemaining = Math.ceil((new Date(user.passwordResetExpires).getTime() - Date.now()) / 60000);
        console.log(`[forgot-password] Rate limit - user ${email} has active reset token, ${minutesRemaining} minutes remaining`);
        // Still return success to not reveal if account exists
        return res.json({ success: true, message: "If an account exists with this email, you will receive a password reset link" });
      }

      // Generate secure reset token (32 bytes = 64 hex characters)
      const resetToken = randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Update user with reset token
      await storage.upsertUser({
        ...user,
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      // Build reset URL
      // Use REPLIT_DOMAINS for production, fallback to development URL
      let appUrl = `http://localhost:5000`;
      if (process.env.REPLIT_DOMAINS) {
        const domains = process.env.REPLIT_DOMAINS.split(',');
        appUrl = `https://${domains[0]}`;
      } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        appUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      }

      const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

      console.log(`[forgot-password] Reset token generated for ${email}, expires in 1 hour`);

      // Log password reset request
      await storage.logAuthEvent(
        user.id,
        'password_reset_requested',
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
      );

      // Return data for frontend to send email via EmailJS
      res.json({ 
        success: true, 
        message: "If an account exists with this email, you will receive a password reset link",
        // Include data for EmailJS (only returned if user exists)
        emailData: {
          userName: user.firstName || user.email.split('@')[0],
          userEmail: user.email,
          resetUrl,
        }
      });
    } catch (error) {
      console.error("[forgot-password] Error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with token
  app.post('/api/auth/reset-password', async (req: any, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Find user by reset token
      const user = await storage.getUserByPasswordResetToken(token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!user.passwordResetExpires || new Date(user.passwordResetExpires) < new Date()) {
        return res.status(400).json({ message: "Reset token has expired. Please request a new one" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user: set new password and clear reset token
      await storage.upsertUser({
        ...user,
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      console.log(`[reset-password] Password successfully reset for user: ${user.email}`);

      // Log password reset completion
      await storage.logAuthEvent(
        user.id,
        'password_reset_completed',
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent']
      );

      res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error) {
      console.error("[reset-password] Error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Data request routes
  app.post('/api/requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertDataRequestSchema.parse(req.body);
      
      const request = await storage.createDataRequest(validatedData, userId);
      
      // Get requester info for notification
      const requester = await storage.getUser(userId);
      
      // Send in-portal notifications to all Data Leads
      const dataLeads = await storage.getUsersByRole('team_lead');
      for (const lead of dataLeads) {
        await storage.createNotification({
          userId: lead.id,
          type: 'request_submitted',
          title: 'New Data Request Submitted',
          message: `${requester?.firstName} ${requester?.lastName} submitted a new ${request.type.replace(/_/g, ' ')} request: ${request.title}`,
          requestId: request.id,
        });
      }
      
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

  app.patch('/api/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requestId = req.params.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get the existing request to check permissions
      const existingRequest = await storage.getDataRequest(requestId);
      if (!existingRequest) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Check permissions: only requester or team lead can update
      if (user.role === 'requester' && existingRequest.requestedById !== userId) {
        return res.status(403).json({ message: "You can only update your own requests" });
      }

      if (user.role === 'analyst') {
        return res.status(403).json({ message: "Analysts cannot update request details" });
      }

      // Validate the data
      const validatedData = insertDataRequestSchema.parse(req.body);
      
      // Update the request
      const updatedRequest = await storage.updateDataRequest(requestId, validatedData);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating request:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update request" });
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

      // Start with query filters (for status, department, priority, type, and date)
      const filters = {
        status: req.query.status as string,
        department: req.query.department as string,
        priority: req.query.priority as string,
        type: req.query.type as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
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
      const requestToUpdate = await storage.getDataRequest(req.params.id);
      
      if (!requestToUpdate) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Allow analysts OR team leads who are assigned to the request
      const isAnalyst = user?.role === 'analyst';
      const isAssignedTeamLead = user?.role === 'team_lead' && requestToUpdate.assignedToId === user.id;
      
      if (!user || (!isAnalyst && !isAssignedTeamLead)) {
        return res.status(403).json({ message: "Only analysts or assigned team leads can update request status" });
      }

      const { status, estimatedDays } = req.body;
      const request = await storage.updateDataRequestStatus(req.params.id, status, estimatedDays);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Create notifications for status change
      const analystName = `${user.firstName} ${user.lastName}`;
      const statusDisplay = status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      
      // Notify requester
      if (request.requestedById && request.requestedById !== user.id) {
        try {
          await storage.createNotification({
            userId: request.requestedById,
            type: 'status_changed',
            title: 'Request Status Updated',
            message: `${analystName} changed the status of "${request.title}" to ${statusDisplay}`,
            requestId: request.id,
            read: 'false',
          });
        } catch (error) {
          console.error('Failed to create notification for requester:', error);
        }
      }
      
      // Notify data lead (reviewer)
      if (request.reviewedById && request.reviewedById !== user.id) {
        try {
          await storage.createNotification({
            userId: request.reviewedById,
            type: 'status_changed',
            title: 'Request Status Updated',
            message: `${analystName} changed the status of "${request.title}" to ${statusDisplay}`,
            requestId: request.id,
            read: 'false',
          });
        } catch (error) {
          console.error('Failed to create notification for data lead:', error);
        }
      }
      
      // Send WebSocket notifications
      const wsServer = getWebSocketServer();
      if (wsServer) {
        const recipients = [];
        if (request.requestedById && request.requestedById !== user.id) {
          recipients.push(request.requestedById);
        }
        if (request.reviewedById && request.reviewedById !== user.id) {
          recipients.push(request.reviewedById);
        }
        
        if (recipients.length > 0) {
          wsServer.notifyMultipleUsers(recipients, {
            type: 'status_changed',
            requestId: request.id,
            message: `Status changed to ${statusDisplay}`,
          });
        }
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

      // Create notifications for priority/deadline change
      const dataLeadName = `${user.firstName} ${user.lastName}`;
      const priorityDisplay = priority.replace(/_/g, '-').toUpperCase();
      const deadlineDisplay = new Date(dueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      // Notify requester
      if (request.requestedById && request.requestedById !== user.id) {
        try {
          await storage.createNotification({
            userId: request.requestedById,
            type: 'priority_changed',
            title: 'Request Priority/Deadline Updated',
            message: `${dataLeadName} updated "${request.title}" - Priority: ${priorityDisplay}, Deadline: ${deadlineDisplay}`,
            requestId: request.id,
            read: 'false',
          });
        } catch (error) {
          console.error('Failed to create notification for requester:', error);
        }
      }
      
      // Notify analyst if assigned
      if (request.assignedToId && request.assignedToId !== user.id) {
        try {
          await storage.createNotification({
            userId: request.assignedToId,
            type: 'deadline_changed',
            title: 'Request Priority/Deadline Updated',
            message: `${dataLeadName} updated "${request.title}" - Priority: ${priorityDisplay}, Deadline: ${deadlineDisplay}`,
            requestId: request.id,
            read: 'false',
          });
        } catch (error) {
          console.error('Failed to create notification for analyst:', error);
        }
      }
      
      // Send WebSocket notifications
      const wsServer = getWebSocketServer();
      if (wsServer) {
        const recipients = [];
        if (request.requestedById && request.requestedById !== user.id) {
          recipients.push(request.requestedById);
        }
        if (request.assignedToId && request.assignedToId !== user.id) {
          recipients.push(request.assignedToId);
        }
        
        if (recipients.length > 0) {
          wsServer.notifyMultipleUsers(recipients, {
            type: 'priority_deadline_changed',
            requestId: request.id,
            message: `Priority and deadline updated`,
          });
        }
      }

      res.json(request);
    } catch (error) {
      console.error("Error updating priority and deadline:", error);
      res.status(500).json({ message: "Failed to update priority and deadline" });
    }
  });

  app.patch('/api/requests/:id/request-type', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== 'team_lead' && user.role !== 'analyst')) {
        return res.status(403).json({ message: "Only Data Lead and Analysts can update request type" });
      }

      const { type } = req.body;
      if (!type) {
        return res.status(400).json({ message: "Request type is required" });
      }

      const request = await storage.updateDataRequestType(req.params.id, type);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error updating request type:", error);
      res.status(500).json({ message: "Failed to update request type" });
    }
  });

  app.delete('/api/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      // Only primary Data Lead can delete requests
      const isPrimaryDataLead = user?.email === 'abdur.rehman@taleemabad.com' && user?.role === 'team_lead';
      
      if (!user || !isPrimaryDataLead) {
        return res.status(403).json({ message: "Only the primary Data Lead can delete requests" });
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

      // Get user names for notifications
      const dataLeadName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Data Lead';

      // Create persistent notification for requester
      if (request.requestedById) {
        try {
          await storage.createNotification({
            userId: request.requestedById,
            type: 'request_accepted',
            title: 'Request Accepted',
            message: `${dataLeadName} accepted your request "${request.title}". Click to view details.`,
            requestId: request.id,
            read: 'false',
          });
        } catch (error) {
          console.error('Failed to create notification for requester:', error);
        }
      }

      // If analyst is already assigned, notify them too
      if (request.assignedToId) {
        try {
          await storage.createNotification({
            userId: request.assignedToId,
            type: 'request_accepted',
            title: 'Request Accepted - Ready to Work',
            message: `The request "${request.title}" has been accepted and is ready for you to complete.`,
            requestId: request.id,
            read: 'false',
          });
        } catch (error) {
          console.error('Failed to create notification for analyst:', error);
        }
      }

      const wsServer = getWebSocketServer();
      if (wsServer) {
        wsServer.notifyUser(request.requestedById, {
          type: 'request_accepted',
          requestId: request.id,
          message: `Your request "${request.title}" has been accepted`,
        });
        
        // Also notify analyst via WebSocket if assigned
        if (request.assignedToId) {
          wsServer.notifyUser(request.assignedToId, {
            type: 'request_accepted',
            requestId: request.id,
            message: `Request "${request.title}" is ready to work on`,
          });
        }
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
      if (!user || !user.role || !['team_lead', 'analyst'].includes(user.role)) {
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
          
          const wsServer = getWebSocketServer();
          if (wsServer) {
            wsServer.notifyUser(requester.id, {
              type: 'request_rejected',
              requestId: request.id,
              message: `Your request "${request.title}" requires modifications`,
            });
          }
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
            
            const wsServer = getWebSocketServer();
            if (wsServer) {
              wsServer.notifyUser(dataLead.id, {
                type: 'analyst_rejected_request',
                requestId: request.id,
                message: `Analyst rejected request "${request.title}"`,
              });
            }
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

  app.patch('/api/requests/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      // Both Data Lead and Analyst can complete requests
      if (!user || !user.role || !['team_lead', 'analyst'].includes(user.role)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // For analysts, verify they're assigned to this request
      if (user.role === 'analyst') {
        const requestDetails = await storage.getDataRequest(req.params.id);
        if (!requestDetails || requestDetails.assignedToId !== user.id) {
          return res.status(403).json({ message: "You can only complete requests assigned to you" });
        }
      }

      const request = await storage.completeRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Notify all stakeholders
      const requester = await storage.getUser(request.requestedById);
      const completedBy = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '';
      
      // Notify requester
      if (requester) {
        try {
          await storage.createNotification({
            userId: requester.id,
            type: 'request_completed',
            title: 'Request Completed',
            message: `Your request "${request.title}" has been successfully completed by ${completedBy}.`,
            requestId: request.id,
            read: 'false',
          });
          
          const wsServer = getWebSocketServer();
          if (wsServer) {
            wsServer.notifyUser(requester.id, {
              type: 'request_completed',
              requestId: request.id,
              message: `Your request "${request.title}" has been completed`,
            });
          }
        } catch (notifError) {
          console.error('[notification] Failed to create requester notification:', notifError);
        }
      }

      // Notify assigned analyst (if different from completer)
      if (request.assignedToId && request.assignedToId !== user.id) {
        try {
          const analyst = await storage.getUser(request.assignedToId);
          if (analyst) {
            await storage.createNotification({
              userId: analyst.id,
              type: 'request_completed',
              title: 'Request Completed',
              message: `Request "${request.title}" has been completed by ${completedBy}.`,
              requestId: request.id,
              read: 'false',
            });
            
            const wsServer = getWebSocketServer();
            if (wsServer) {
              wsServer.notifyUser(analyst.id, {
                type: 'request_completed',
                requestId: request.id,
                message: `Request "${request.title}" has been completed`,
              });
            }
          }
        } catch (notifError) {
          console.error('[notification] Failed to create analyst notification:', notifError);
        }
      }

      // Notify team lead (if different from completer)
      if (request.reviewedById && request.reviewedById !== user.id) {
        try {
          const teamLead = await storage.getUser(request.reviewedById);
          if (teamLead) {
            await storage.createNotification({
              userId: teamLead.id,
              type: 'request_completed',
              title: 'Request Completed',
              message: `Request "${request.title}" has been completed by ${completedBy}.`,
              requestId: request.id,
              read: 'false',
            });
            
            const wsServer = getWebSocketServer();
            if (wsServer) {
              wsServer.notifyUser(teamLead.id, {
                type: 'request_completed',
                requestId: request.id,
                message: `Request "${request.title}" has been completed`,
              });
            }
          }
        } catch (notifError) {
          console.error('[notification] Failed to create team lead notification:', notifError);
        }
      }

      res.json(request);
    } catch (error) {
      console.error("Error completing request:", error);
      res.status(500).json({ message: "Failed to complete request" });
    }
  });

  app.patch('/api/requests/:id/delivered', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const requestToDeliver = await storage.getDataRequest(req.params.id);
      
      if (!requestToDeliver) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Allow analysts OR team leads who are assigned to the request
      const isAnalyst = user?.role === 'analyst' || user?.role === 'data_analyst';
      const isAssignedTeamLead = user?.role === 'team_lead' && requestToDeliver.assignedToId === user.id;
      
      if (!user || (!isAnalyst && !isAssignedTeamLead)) {
        return res.status(403).json({ message: "Only assigned users (analysts or assigned team leads) can mark requests as delivered" });
      }

      const { deliveryType, deliveryLink, deliveryContent, deliveryFileUrl, deliveryFileName } = req.body;
      
      if (!deliveryType || !['attachment', 'link', 'text'].includes(deliveryType)) {
        return res.status(400).json({ message: "Valid delivery type is required (attachment, link, or text)" });
      }

      // Validate required fields based on delivery type
      if (deliveryType === 'link' && !deliveryLink) {
        return res.status(400).json({ message: "Delivery link is required when delivery type is link" });
      }
      
      if (deliveryType === 'text' && !deliveryContent) {
        return res.status(400).json({ message: "Delivery content is required when delivery type is text" });
      }
      
      if (deliveryType === 'attachment' && (!deliveryFileUrl || !deliveryFileName)) {
        return res.status(400).json({ message: "File URL and file name are required when delivery type is attachment" });
      }

      const request = await storage.deliverRequest(
        req.params.id, 
        deliveryType, 
        deliveryLink,
        deliveryContent,
        deliveryFileUrl,
        deliveryFileName
      );
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Notify stakeholders
      const wsServer = getWebSocketServer();
      const notifyUsers = [];
      
      // Notify requester
      if (request.requestedById && request.requestedById !== user.id) {
        notifyUsers.push(request.requestedById);
      }
      
      // Notify Data Lead if reviewed
      if (request.reviewedById && request.reviewedById !== user.id) {
        notifyUsers.push(request.reviewedById);
      }
      
      // Send WebSocket notifications
      if (wsServer && notifyUsers.length > 0) {
        notifyUsers.forEach(userId => {
          wsServer.notifyUser(userId, {
            type: 'request_delivered',
            requestId: request.id,
            message: `Request "${request.title}" has been delivered`,
          });
        });
      }

      res.json(request);
    } catch (error) {
      console.error("Error marking request as delivered:", error);
      res.status(500).json({ message: "Failed to mark request as delivered" });
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
          
          const wsServer = getWebSocketServer();
          if (wsServer) {
            wsServer.notifyUser(assignedAnalyst.id, {
              type: 'request_assigned',
              requestId: request.id,
              message: `You have been assigned to work on "${request.title}"`,
            });
          }
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
          
          const wsServer = getWebSocketServer();
          if (wsServer) {
            wsServer.notifyUser(requester.id, {
              type: 'request_accepted',
              requestId: request.id,
              message: `Your request "${request.title}" has been accepted`,
            });
          }
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

      // Create notifications for request stakeholders
      const request = await storage.getDataRequest(req.params.id);
      if (request) {
        const analystName = `${user.firstName} ${user.lastName}`;
        
        // Notify requester
        if (request.requestedById) {
          try {
            await storage.createNotification({
              userId: request.requestedById,
              type: 'blocker_added',
              title: 'Blocker Added to Your Request',
              message: `${analystName} added a blocker to "${request.title}": ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
              requestId: request.id,
              read: 'false',
            });
          } catch (error) {
            console.error('Failed to create notification for requester:', error);
          }
        }
        
        // Notify data lead (reviewer)
        if (request.reviewedById && request.reviewedById !== user.id) {
          try {
            await storage.createNotification({
              userId: request.reviewedById,
              type: 'blocker_added',
              title: 'Blocker Added to Request',
              message: `${analystName} added a blocker to "${request.title}": ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
              requestId: request.id,
              read: 'false',
            });
          } catch (error) {
            console.error('Failed to create notification for data lead:', error);
          }
        }
        
        // Send WebSocket notifications
        const wsServer = getWebSocketServer();
        if (wsServer) {
          const recipients = [request.requestedById];
          if (request.reviewedById && request.reviewedById !== user.id) {
            recipients.push(request.reviewedById);
          }
          
          wsServer.notifyMultipleUsers(recipients, {
            type: 'blocker_added',
            requestId: request.id,
            message: `A blocker was added to "${request.title}"`,
          });
        }
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
      
      const request = await storage.getDataRequest(req.params.id);
      if (request) {
        const commenter = await storage.getUser(userId);
        const commenterName = commenter ? `${commenter.firstName} ${commenter.lastName}` : 'Someone';
        
        // Create notifications for all stakeholders
        const participants = [request.requestedById];
        if (request.assignedToId) participants.push(request.assignedToId);
        if (request.reviewedById) participants.push(request.reviewedById);
        
        const uniqueParticipants = Array.from(new Set(participants)).filter(id => id !== userId);
        
        for (const participantId of uniqueParticipants) {
          try {
            await storage.createNotification({
              userId: participantId,
              type: 'comment_added',
              title: 'New Comment Added',
              message: `${commenterName} commented on "${request.title}": ${validatedData.content.substring(0, 100)}${validatedData.content.length > 100 ? '...' : ''}`,
              requestId: request.id,
              read: 'false',
            });
          } catch (error) {
            console.error(`Failed to create notification for user ${participantId}:`, error);
          }
        }
        
        const wsServer = getWebSocketServer();
        if (wsServer) {
          wsServer.notifyMultipleUsers(uniqueParticipants, {
            type: 'new_comment',
            requestId: request.id,
            message: `New comment added to "${request.title}"`,
          });
        }
      }
      
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

  // Task routes
  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      // Only team leads and analysts can create tasks
      if (!user || (user.role !== 'team_lead' && user.role !== 'analyst')) {
        return res.status(403).json({ message: "Only team leads and analysts can create tasks" });
      }
      
      // Validate and sanitize task data
      const taskSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        optimisticTime: z.number().nonnegative().optional(),
        mostLikelyTime: z.number().nonnegative().optional(),
        pessimisticTime: z.number().nonnegative().optional(),
        assignedToId: z.string().optional(),
        requestId: z.string().optional(),
        parentTaskId: z.string().optional(),
        dueDate: z.string().optional(),
      });
      
      const taskData = taskSchema.parse(req.body);
      
      // Transform dueDate string to Date if provided
      const transformedData = {
        ...taskData,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
      };
      
      // Create task
      const task = await storage.createTask(transformedData, req.user.id);
      
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const filters: any = {};

      // Filter based on query params
      if (req.query.status) filters.status = req.query.status;
      if (req.query.requestId) filters.requestId = req.query.requestId;

      // Role-based filtering - STRICTLY ENFORCED
      if (user?.role === 'analyst') {
        // Analysts see ONLY tasks assigned to them - NO BYPASS
        filters.assignedToId = user.id;
      } else if (user?.role === 'team_lead') {
        // Team leads can see all tasks or filter by assignee
        if (req.query.assignedToId) {
          filters.assignedToId = req.query.assignedToId;
        }
      } else {
        // Requesters cannot access tasks
        return res.status(403).json({ message: "Access denied" });
      }

      const tasks = await storage.getTasks(filters);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check permissions: assignee, creator, or team lead can view
      const user = await storage.getUser(req.user.id);
      const canView = 
        task.assignedToId === req.user.id ||
        task.createdById === req.user.id ||
        user?.role === 'team_lead';

      if (!canView) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check permissions: assignee, creator, or team lead can update
      const user = await storage.getUser(req.user.id);
      const canUpdate = 
        task.assignedToId === req.user.id ||
        task.createdById === req.user.id ||
        user?.role === 'team_lead';

      if (!canUpdate) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedTask = await storage.updateTask(req.params.id, req.body);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.patch('/api/tasks/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      
      if (!status || !['to_do', 'in_progress', 'blocked', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const task = await storage.getTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check permissions
      const user = await storage.getUser(req.user.id);
      const canUpdate = 
        task.assignedToId === req.user.id ||
        task.createdById === req.user.id ||
        user?.role === 'team_lead';

      if (!canUpdate) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedTask = await storage.updateTaskStatus(req.params.id, status);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  app.patch('/api/tasks/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const { assignedToId } = req.body;

      // Team lead can assign to anyone, analysts can self-assign
      const canAssign = user?.role === 'team_lead' || assignedToId === req.user.id;

      if (!canAssign) {
        return res.status(403).json({ message: "Access denied" });
      }

      const task = await storage.assignTask(req.params.id, assignedToId);
      res.json(task);
    } catch (error) {
      console.error("Error assigning task:", error);
      res.status(500).json({ message: "Failed to assign task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const task = await storage.getTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only creator or team lead can delete
      const canDelete = task.createdById === req.user.id || user?.role === 'team_lead';

      if (!canDelete) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteTask(req.params.id);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Get tasks linked to a specific request
  app.get('/api/requests/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const request = await storage.getDataRequest(req.params.id);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Check permissions: requester, assigned analyst, or team lead can view
      const canView = 
        request.requestedById === req.user.id ||
        request.assignedToId === req.user.id ||
        user?.role === 'team_lead';

      if (!canView) {
        return res.status(403).json({ message: "Access denied" });
      }

      const requestTasks = await storage.getTasks({ requestId: req.params.id });
      res.json(requestTasks);
    } catch (error) {
      console.error("Error fetching request tasks:", error);
      res.status(500).json({ message: "Failed to fetch request tasks" });
    }
  });

  app.get('/api/tasks/workload/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      // Team leads can view anyone's workload, users can view their own
      if (user?.role !== 'team_lead' && req.params.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const workload = await storage.getUserWorkload(req.params.userId);
      res.json(workload);
    } catch (error) {
      console.error("Error fetching workload:", error);
      res.status(500).json({ message: "Failed to fetch workload" });
    }
  });

  // Sub-task routes
  app.get('/api/tasks/:id/subtasks', isAuthenticated, async (req: any, res) => {
    try {
      const parentTask = await storage.getTask(req.params.id);
      
      if (!parentTask) {
        return res.status(404).json({ message: "Parent task not found" });
      }

      // Check permissions: assignee, creator, or team lead can view
      const user = await storage.getUser(req.user.id);
      const canView = 
        parentTask.assignedToId === req.user.id ||
        parentTask.createdById === req.user.id ||
        user?.role === 'team_lead';

      if (!canView) {
        return res.status(403).json({ message: "Access denied" });
      }

      const subTasks = await storage.getSubTasks(req.params.id);
      res.json(subTasks);
    } catch (error) {
      console.error("Error fetching sub-tasks:", error);
      res.status(500).json({ message: "Failed to fetch sub-tasks" });
    }
  });

  app.get('/api/tasks/:id/subtasks/progress', isAuthenticated, async (req: any, res) => {
    try {
      const parentTask = await storage.getTask(req.params.id);
      
      if (!parentTask) {
        return res.status(404).json({ message: "Parent task not found" });
      }

      // Check permissions: assignee, creator, or team lead can view
      const user = await storage.getUser(req.user.id);
      const canView = 
        parentTask.assignedToId === req.user.id ||
        parentTask.createdById === req.user.id ||
        user?.role === 'team_lead';

      if (!canView) {
        return res.status(403).json({ message: "Access denied" });
      }

      const progress = await storage.getSubTaskProgress(req.params.id);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching sub-task progress:", error);
      res.status(500).json({ message: "Failed to fetch sub-task progress" });
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
      const stats = await storage.getRequestStats(userId, user?.role || undefined);
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

  // Task Analytics Routes
  app.get('/api/analytics/tasks/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'team_lead' && user?.role !== 'analyst') {
        return res.status(403).json({ message: "Access denied. Only Data Lead and Analysts can view task analytics." });
      }

      const stats = await storage.getTaskStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching task stats:", error);
      res.status(500).json({ message: "Failed to fetch task stats" });
    }
  });

  app.get('/api/analytics/tasks/by-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'team_lead' && user?.role !== 'analyst') {
        return res.status(403).json({ message: "Access denied." });
      }

      const stats = await storage.getTasksByStatus();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching task status stats:", error);
      res.status(500).json({ message: "Failed to fetch task status stats" });
    }
  });

  app.get('/api/analytics/tasks/by-assignee', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'team_lead' && user?.role !== 'analyst') {
        return res.status(403).json({ message: "Access denied." });
      }

      const stats = await storage.getTasksByAssignee();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching task assignee stats:", error);
      res.status(500).json({ message: "Failed to fetch task assignee stats" });
    }
  });

  app.get('/api/analytics/tasks/request-linked', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'team_lead' && user?.role !== 'analyst') {
        return res.status(403).json({ message: "Access denied." });
      }

      const stats = await storage.getTasksRequestLinked();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching request-linked stats:", error);
      res.status(500).json({ message: "Failed to fetch request-linked stats" });
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

  // Admin route to fix delivered requests with incorrect status
  app.post('/api/admin/fix-delivered-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      // Only allow team_lead (Data Lead) to run this
      if (!user || user.role !== 'team_lead') {
        return res.status(403).json({ message: "Unauthorized - Data Lead only" });
      }

      const result = await storage.fixDeliveredRequestsStatus();
      res.json(result);
    } catch (error) {
      console.error("Error fixing delivered requests:", error);
      res.status(500).json({ message: "Failed to fix delivered requests" });
    }
  });

  const httpServer = createServer(app);
  setupWebSocketServer(httpServer);
  return httpServer;
}
