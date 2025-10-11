import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User role enum
export const userRoleEnum = pgEnum("user_role", [
  "requester",
  "team_lead",
  "analyst",
  "data_analyst"  // Legacy - will migrate to analyst
]);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // Hashed password for email/password auth (null for invited users who haven't set password)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role"), // requester, team_lead, analyst (null for new signups before role selection)
  department: varchar("department"), // Program, P&C, Product, LP, Training, ERP, Finance, Leadership, Strategy, Other
  passwordResetToken: varchar("password_reset_token"), // Token for password reset
  passwordResetExpires: timestamp("password_reset_expires"), // Expiry time for reset token
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Request status enum
export const requestStatusEnum = pgEnum("request_status", [
  "submitted",         // Legacy - will migrate to pending_review
  "under_review",      // Legacy - will migrate to pending_review
  "pending_review",    // Waiting for team lead to review
  "rejected",          // Rejected by team lead
  "accepted",          // Accepted by team lead, waiting for assignment
  "assigned",          // Assigned to analyst
  "in_progress",       // Analyst working on it
  "blocked",           // Has blockers
  "completed",
  "cancelled"
]);

// Request priority enum
export const requestPriorityEnum = pgEnum("request_priority", [
  "p0_critical",
  "p1_high", 
  "p2_medium",
  "p3_low"
]);

// Request type enum
export const requestTypeEnum = pgEnum("request_type", [
  "new_dashboard",
  "modify_dashboard",
  "adhoc_analysis",
  "data_extraction",
  "data_bug",
  "bq_access",
  "tracking",
  "metric_change",
  "pipeline_change",
  "recurring_report",
  "other"
]);

// Auth logs enum for tracking login/signup events
export const authEventTypeEnum = pgEnum("auth_event_type", [
  "signup",
  "signin",
  "signout"
]);

// Notification type enum
export const notificationTypeEnum = pgEnum("notification_type", [
  "request_submitted",
  "request_accepted",
  "request_rejected",
  "request_assigned",
  "analyst_rejected_request",
  "comment_added",
  "blocker_added",
  "request_completed"
]);

// Data requests table
export const dataRequests = pgTable("data_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  type: requestTypeEnum("type").notNull(),
  priority: requestPriorityEnum("priority").notNull(),
  status: requestStatusEnum("status").notNull().default("pending_review"),
  department: varchar("department").notNull(),
  team: varchar("team"), // Sub-department/team within department
  requestedById: varchar("requested_by_id").notNull().references(() => users.id),
  reviewedById: varchar("reviewed_by_id").references(() => users.id), // Team lead who reviewed
  assignedToId: varchar("assigned_to_id").references(() => users.id), // Analyst assigned
  dueDate: timestamp("due_date").notNull(),
  suggestedDeadline: timestamp("suggested_deadline"), // Analyst's suggested deadline
  estimatedCompletionDays: integer("estimated_completion_days"),
  
  // Review fields
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  
  // Common fields
  primaryQuestion: text("primary_question"),
  businessProblem: text("business_problem"),
  decisionAction: text("decision_action"),
  impact: varchar("impact"),
  frequency: varchar("frequency"),
  frequencyDuration: integer("frequency_duration"),
  frequencyUnit: varchar("frequency_unit"),
  
  // Dashboard-specific fields
  dashboardAudience: text("dashboard_audience"),
  dashboardRefreshFrequency: varchar("dashboard_refresh_frequency"),
  keyMetrics: text("key_metrics"),
  filters: text("filters"),
  mockups: text("mockups"),
  actionPlan: text("action_plan"),
  
  // BigQuery access fields
  bqEmail: varchar("bq_email"),
  bqDatasets: text("bq_datasets"),
  bqPurpose: text("bq_purpose"),
  
  // Bug-specific fields
  bugDescription: text("bug_description"),
  bugLocation: text("bug_location"),
  
  // Tracking-specific fields
  trackingEvent: varchar("tracking_event"),
  trackingPlatform: varchar("tracking_platform"),
  trackingDetails: text("tracking_details"),
  
  // Metric change fields
  metricName: varchar("metric_name"),
  metricChangeType: varchar("metric_change_type"),
  metricReason: text("metric_reason"),
  
  // Pipeline change fields
  pipelineName: varchar("pipeline_name"),
  pipelineChangeType: varchar("pipeline_change_type"),
  pipelineDetails: text("pipeline_details"),
  
  // Delivery fields
  deliveryLinks: text("delivery_links").array(), // Links to deliverables (dashboards, reports, etc.)
  deliveryNotes: text("delivery_notes"), // Additional notes about the delivery
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments table for request communication
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => dataRequests.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attachments table for file uploads
export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => dataRequests.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  uploadedById: varchar("uploaded_by_id").notNull().references(() => users.id),
  isDelivery: varchar("is_delivery").notNull().default("false"), // "true" for delivery attachments, "false" for request attachments
  createdAt: timestamp("created_at").defaultNow(),
});

// Blockers table for tracking issues/blockers by analysts
export const blockers = pgTable("blockers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => dataRequests.id, { onDelete: 'cascade' }),
  description: text("description").notNull(),
  reportedById: varchar("reported_by_id").notNull().references(() => users.id),
  resolved: varchar("resolved").notNull().default("false"), // "true" or "false"
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Auth logs table for tracking user authentication events
export const authLogs = pgTable("auth_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  eventType: authEventTypeEnum("event_type").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table for in-portal notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  requestId: varchar("request_id").references(() => dataRequests.id, { onDelete: 'cascade' }),
  read: varchar("read").notNull().default("false"), // "true" or "false"
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  requestedDataRequests: many(dataRequests, { relationName: "requestedBy" }),
  reviewedDataRequests: many(dataRequests, { relationName: "reviewedBy" }),
  assignedDataRequests: many(dataRequests, { relationName: "assignedTo" }),
  comments: many(comments),
  blockers: many(blockers),
  authLogs: many(authLogs),
  notifications: many(notifications),
}));

export const dataRequestsRelations = relations(dataRequests, ({ one, many }) => ({
  requestedBy: one(users, {
    fields: [dataRequests.requestedById],
    references: [users.id],
    relationName: "requestedBy",
  }),
  reviewedBy: one(users, {
    fields: [dataRequests.reviewedById],
    references: [users.id],
    relationName: "reviewedBy",
  }),
  assignedTo: one(users, {
    fields: [dataRequests.assignedToId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  comments: many(comments),
  attachments: many(attachments),
  blockers: many(blockers),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  request: one(dataRequests, {
    fields: [comments.requestId],
    references: [dataRequests.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  request: one(dataRequests, {
    fields: [attachments.requestId],
    references: [dataRequests.id],
  }),
  uploadedBy: one(users, {
    fields: [attachments.uploadedById],
    references: [users.id],
  }),
}));

export const blockersRelations = relations(blockers, ({ one }) => ({
  request: one(dataRequests, {
    fields: [blockers.requestId],
    references: [dataRequests.id],
  }),
  reportedBy: one(users, {
    fields: [blockers.reportedById],
    references: [users.id],
  }),
}));

export const authLogsRelations = relations(authLogs, ({ one }) => ({
  user: one(users, {
    fields: [authLogs.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  request: one(dataRequests, {
    fields: [notifications.requestId],
    references: [dataRequests.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDataRequestSchema = createInsertSchema(dataRequests).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  requestedById: true,
  assignedToId: true,
  status: true 
}).extend({
  dueDate: z.union([z.date(), z.string()]).transform((val) => new Date(val))
});
export const insertCommentSchema = createInsertSchema(comments).omit({ 
  id: true, 
  createdAt: true,
  userId: true 
});
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ 
  id: true, 
  createdAt: true,
  uploadedById: true 
});
export const insertBlockerSchema = createInsertSchema(blockers).omit({ 
  id: true, 
  createdAt: true,
  reportedById: true 
});
export const insertAuthLogSchema = createInsertSchema(authLogs).omit({ 
  id: true, 
  createdAt: true 
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertDataRequest = z.infer<typeof insertDataRequestSchema>;
export type DataRequest = typeof dataRequests.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertBlocker = z.infer<typeof insertBlockerSchema>;
export type Blocker = typeof blockers.$inferSelect;
export type InsertAuthLog = z.infer<typeof insertAuthLogSchema>;
export type AuthLog = typeof authLogs.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Extended types for API responses
export type DataRequestWithDetails = DataRequest & {
  requestedBy: User;
  reviewedBy: User | null;
  assignedTo: User | null;
  comments: (Comment & { user: User })[];
  attachments: (Attachment & { uploadedBy: User })[];
  blockers: (Blocker & { reportedBy: User })[];
};
