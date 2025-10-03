import {
  users,
  dataRequests,
  comments,
  attachments,
  type User,
  type UpsertUser,
  type DataRequest,
  type InsertDataRequest,
  type Comment,
  type InsertComment,
  type Attachment,
  type InsertAttachment,
  type DataRequestWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getDataAnalysts(): Promise<User[]>;
  
  // Data request operations
  createDataRequest(request: InsertDataRequest, userId: string): Promise<DataRequest>;
  getDataRequest(id: string): Promise<DataRequestWithDetails | undefined>;
  getDataRequests(filters?: {
    status?: string;
    department?: string;
    priority?: string;
    type?: string;
    requestedById?: string;
    assignedToId?: string;
  }): Promise<DataRequestWithDetails[]>;
  updateDataRequestStatus(id: string, status: string, estimatedDays?: number): Promise<DataRequest | undefined>;
  assignDataRequest(id: string, analystId: string): Promise<DataRequest | undefined>;
  updateDataRequestPriorityAndDeadline(id: string, priority: string, dueDate: Date): Promise<DataRequest | undefined>;
  purgeAllRequests(): Promise<{ deleted: number }>;
  
  // Comment operations
  addComment(comment: InsertComment, userId: string): Promise<Comment>;
  getRequestComments(requestId: string): Promise<(Comment & { user: User })[]>;
  
  // Attachment operations
  addAttachment(attachment: InsertAttachment, userId: string): Promise<Attachment>;
  getRequestAttachments(requestId: string): Promise<(Attachment & { uploadedBy: User })[]>;
  getAttachmentByFilePath(filePath: string): Promise<Attachment | undefined>;
  
  // Analytics operations
  getRequestStats(): Promise<{
    totalRequests: number;
    inProgress: number;
    completed: number;
    avgCompletionDays: number;
  }>;
  getDepartmentStats(): Promise<{ department: string; count: number }[]>;
  getTypeStats(): Promise<{ type: string; count: number }[]>;
  getPriorityStats(): Promise<{ priority: string; count: number }[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getDataAnalysts(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'data_analyst'));
  }

  async createDataRequest(request: InsertDataRequest, userId: string): Promise<DataRequest> {
    const [dataRequest] = await db
      .insert(dataRequests)
      .values({
        ...request,
        requestedById: userId,
      })
      .returning();
    return dataRequest;
  }

  async getDataRequest(id: string): Promise<DataRequestWithDetails | undefined> {
    const result = await db
      .select({
        request: dataRequests,
        requestedBy: users,
        assignedTo: {
          id: sql`assigned_user.id`,
          email: sql`assigned_user.email`,
          firstName: sql`assigned_user.first_name`,
          lastName: sql`assigned_user.last_name`,
          profileImageUrl: sql`assigned_user.profile_image_url`,
          role: sql`assigned_user.role`,
          department: sql`assigned_user.department`,
          createdAt: sql`assigned_user.created_at`,
          updatedAt: sql`assigned_user.updated_at`,
        },
      })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .leftJoin(sql`users assigned_user`, sql`data_requests.assigned_to_id = assigned_user.id`)
      .where(eq(dataRequests.id, id));

    if (result.length === 0) return undefined;

    const requestData = result[0];
    const requestComments = await this.getRequestComments(id);
    const requestAttachments = await this.getRequestAttachments(id);

    return {
      ...requestData.request,
      requestedBy: requestData.requestedBy,
      assignedTo: requestData.assignedTo.id ? requestData.assignedTo : null,
      comments: requestComments,
      attachments: requestAttachments,
    } as DataRequestWithDetails;
  }

  async getDataRequests(filters?: {
    status?: string;
    department?: string;
    priority?: string;
    type?: string;
    requestedById?: string;
    assignedToId?: string;
  }): Promise<DataRequestWithDetails[]> {
    let query = db
      .select({
        request: dataRequests,
        requestedBy: users,
        assignedTo: {
          id: sql`assigned_user.id`,
          email: sql`assigned_user.email`,
          firstName: sql`assigned_user.first_name`,
          lastName: sql`assigned_user.last_name`,
          profileImageUrl: sql`assigned_user.profile_image_url`,
          role: sql`assigned_user.role`,
          department: sql`assigned_user.department`,
          createdAt: sql`assigned_user.created_at`,
          updatedAt: sql`assigned_user.updated_at`,
        },
      })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .leftJoin(sql`users assigned_user`, sql`data_requests.assigned_to_id = assigned_user.id`)
      .orderBy(desc(dataRequests.createdAt));

    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(dataRequests.status, filters.status as any));
      if (filters.department) conditions.push(eq(dataRequests.department, filters.department));
      if (filters.priority) conditions.push(eq(dataRequests.priority, filters.priority as any));
      if (filters.type) conditions.push(eq(dataRequests.type, filters.type as any));
      if (filters.requestedById) conditions.push(eq(dataRequests.requestedById, filters.requestedById));
      if (filters.assignedToId) conditions.push(eq(dataRequests.assignedToId, filters.assignedToId));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }

    const results = await query;

    // Get comments and attachments for each request
    const requestsWithDetails = await Promise.all(
      results.map(async (result) => {
        const requestComments = await this.getRequestComments(result.request.id);
        const requestAttachments = await this.getRequestAttachments(result.request.id);
        return {
          ...result.request,
          requestedBy: result.requestedBy,
          assignedTo: result.assignedTo.id ? result.assignedTo : null,
          comments: requestComments,
          attachments: requestAttachments,
        } as DataRequestWithDetails;
      })
    );

    return requestsWithDetails;
  }

  async updateDataRequestStatus(id: string, status: string, estimatedDays?: number): Promise<DataRequest | undefined> {
    const updateData: any = { status, updatedAt: new Date() };
    if (estimatedDays !== undefined) {
      updateData.estimatedCompletionDays = estimatedDays;
    }

    const [updated] = await db
      .update(dataRequests)
      .set(updateData)
      .where(eq(dataRequests.id, id))
      .returning();
    return updated;
  }

  async assignDataRequest(id: string, analystId: string): Promise<DataRequest | undefined> {
    const [updated] = await db
      .update(dataRequests)
      .set({ assignedToId: analystId, updatedAt: new Date() })
      .where(eq(dataRequests.id, id))
      .returning();
    return updated;
  }

  async updateDataRequestPriorityAndDeadline(id: string, priority: string, dueDate: Date): Promise<DataRequest | undefined> {
    const [updated] = await db
      .update(dataRequests)
      .set({ priority: priority as "low" | "medium" | "high", dueDate, updatedAt: new Date() })
      .where(eq(dataRequests.id, id))
      .returning();
    return updated;
  }

  async addComment(comment: InsertComment, userId: string): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values({ ...comment, userId })
      .returning();
    return newComment;
  }

  async getRequestComments(requestId: string): Promise<(Comment & { user: User })[]> {
    const result = await db
      .select({
        comment: comments,
        user: users,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.requestId, requestId))
      .orderBy(comments.createdAt);

    return result.map(r => ({ ...r.comment, user: r.user }));
  }

  async addAttachment(attachment: InsertAttachment, userId: string): Promise<Attachment> {
    const [newAttachment] = await db
      .insert(attachments)
      .values({ ...attachment, uploadedById: userId })
      .returning();
    return newAttachment;
  }

  async getRequestAttachments(requestId: string): Promise<(Attachment & { uploadedBy: User })[]> {
    const result = await db
      .select({
        attachment: attachments,
        user: users,
      })
      .from(attachments)
      .innerJoin(users, eq(attachments.uploadedById, users.id))
      .where(eq(attachments.requestId, requestId))
      .orderBy(attachments.createdAt);

    return result.map(r => ({ ...r.attachment, uploadedBy: r.user }));
  }

  async getAttachmentByFilePath(filePath: string): Promise<Attachment | undefined> {
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.filePath, filePath));
    return attachment;
  }

  async getRequestStats(): Promise<{
    totalRequests: number;
    inProgress: number;
    completed: number;
    avgCompletionDays: number;
  }> {
    const [totalResult] = await db.select({ count: count() }).from(dataRequests);
    const [inProgressResult] = await db.select({ count: count() }).from(dataRequests).where(eq(dataRequests.status, 'in_progress'));
    const [completedResult] = await db.select({ count: count() }).from(dataRequests).where(eq(dataRequests.status, 'completed'));
    
    const [avgResult] = await db
      .select({ 
        avg: sql<number>`AVG(${dataRequests.estimatedCompletionDays})` 
      })
      .from(dataRequests)
      .where(eq(dataRequests.status, 'completed'));

    return {
      totalRequests: totalResult.count,
      inProgress: inProgressResult.count,
      completed: completedResult.count,
      avgCompletionDays: Math.round(avgResult.avg || 0),
    };
  }

  async getDepartmentStats(): Promise<{ department: string; count: number }[]> {
    const results = await db
      .select({
        department: dataRequests.department,
        count: count(),
      })
      .from(dataRequests)
      .groupBy(dataRequests.department);

    return results.map(r => ({ department: r.department, count: r.count }));
  }

  async getTypeStats(): Promise<{ type: string; count: number }[]> {
    const results = await db
      .select({
        type: dataRequests.type,
        count: count(),
      })
      .from(dataRequests)
      .groupBy(dataRequests.type);

    return results.map(r => ({ type: r.type, count: r.count }));
  }

  async getPriorityStats(): Promise<{ priority: string; count: number }[]> {
    const results = await db
      .select({
        priority: dataRequests.priority,
        count: count(),
      })
      .from(dataRequests)
      .groupBy(dataRequests.priority);

    return results.map(r => ({ priority: r.priority, count: r.count }));
  }

  async purgeAllRequests(): Promise<{ deleted: number }> {
    const [countResult] = await db.select({ count: count() }).from(dataRequests);
    const total = countResult.count;
    
    await db.delete(comments);
    await db.delete(attachments);
    await db.delete(dataRequests);
    
    return { deleted: total };
  }
}

export const storage = new DatabaseStorage();
