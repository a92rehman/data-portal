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

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("team_lead"), // team_lead, data_analyst
  department: varchar("department"), // engineering, product, marketing, operations, finance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Request status enum
export const requestStatusEnum = pgEnum("request_status", [
  "submitted",
  "under_review", 
  "in_progress",
  "completed",
  "cancelled"
]);

// Request priority enum
export const requestPriorityEnum = pgEnum("request_priority", [
  "low",
  "medium", 
  "high"
]);

// Request type enum
export const requestTypeEnum = pgEnum("request_type", [
  "powerbi",
  "adhoc",
  "other"
]);

// Data requests table
export const dataRequests = pgTable("data_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  type: requestTypeEnum("type").notNull(),
  priority: requestPriorityEnum("priority").notNull(),
  status: requestStatusEnum("status").notNull().default("submitted"),
  department: varchar("department").notNull(),
  requestedById: varchar("requested_by_id").notNull().references(() => users.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  dueDate: timestamp("due_date").notNull(),
  estimatedCompletionDays: integer("estimated_completion_days"),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  requestedDataRequests: many(dataRequests, { relationName: "requestedBy" }),
  assignedDataRequests: many(dataRequests, { relationName: "assignedTo" }),
  comments: many(comments),
}));

export const dataRequestsRelations = relations(dataRequests, ({ one, many }) => ({
  requestedBy: one(users, {
    fields: [dataRequests.requestedById],
    references: [users.id],
    relationName: "requestedBy",
  }),
  assignedTo: one(users, {
    fields: [dataRequests.assignedToId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  comments: many(comments),
  attachments: many(attachments),
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertDataRequest = z.infer<typeof insertDataRequestSchema>;
export type DataRequest = typeof dataRequests.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;

// Extended types for API responses
export type DataRequestWithDetails = DataRequest & {
  requestedBy: User;
  assignedTo: User | null;
  comments: (Comment & { user: User })[];
  attachments: (Attachment & { uploadedBy: User })[];
};
