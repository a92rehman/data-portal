import {
  users,
  dataRequests,
  comments,
  attachments,
  blockers,
  authLogs,
  notifications,
  tasks,
  type User,
  type UpsertUser,
  type DataRequest,
  type InsertDataRequest,
  type Comment,
  type InsertComment,
  type Attachment,
  type InsertAttachment,
  type Blocker,
  type InsertBlocker,
  type AuthLog,
  type InsertAuthLog,
  type Notification,
  type InsertNotification,
  type Task,
  type InsertTask,
  type DataRequestWithDetails,
  type TaskWithDetails,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, asc, and, or, count, sql, isNotNull } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(userData: Partial<User>): Promise<User>;
  getDataAnalysts(): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string, department?: string): Promise<User | undefined>;
  deleteUser(userId: string): Promise<void>;
  createInvitedUser(email: string, role: string, department?: string, firstName?: string, lastName?: string): Promise<User>;
  updatePasswordResetToken(userId: string, token: string, expires: Date): Promise<void>;
  updateUserPassword(userId: string, password: string): Promise<void>;
  updateUserPasswordAndName(userId: string, password: string, name: string): Promise<void>;
  
  // Data request operations
  createDataRequest(request: InsertDataRequest, userId: string): Promise<DataRequest>;
  updateDataRequest(id: string, request: InsertDataRequest): Promise<DataRequest | undefined>;
  getDataRequest(id: string): Promise<DataRequestWithDetails | undefined>;
  getDataRequests(filters?: {
    status?: string;
    department?: string;
    priority?: string;
    type?: string;
    requestedById?: string;
    assignedToId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DataRequestWithDetails[]>;
  updateDataRequestStatus(id: string, status: string, estimatedDays?: number): Promise<DataRequest | undefined>;
  assignDataRequest(id: string, analystId: string): Promise<DataRequest | undefined>;
  updateDataRequestPriorityAndDeadline(id: string, priority: string, dueDate: Date): Promise<DataRequest | undefined>;
  updateDataRequestType(id: string, type: string): Promise<DataRequest | undefined>;
  deleteDataRequest(id: string): Promise<void>;
  purgeAllRequests(): Promise<{ deleted: number }>;
  fixDeliveredRequestsStatus(): Promise<{ updated: number; requestIds: string[] }>;
  
  // New three-role workflow operations
  acceptRequest(id: string, reviewerId: string): Promise<DataRequest | undefined>;
  rejectRequest(id: string, reviewerId: string, rejectionReason: string): Promise<DataRequest | undefined>;
  assignToAnalyst(id: string, analystId: string, dueDate?: Date): Promise<DataRequest | undefined>;
  suggestDeadline(id: string, suggestedDeadline: Date): Promise<DataRequest | undefined>;
  completeRequest(id: string): Promise<DataRequest | undefined>;
  deliverRequest(id: string, deliveryType: string, deliveryLink?: string, deliveryContent?: string, deliveryFileUrl?: string, deliveryFileName?: string): Promise<DataRequest | undefined>;
  
  // Blocker operations
  addBlocker(requestId: string, description: string, reportedById: string): Promise<Blocker>;
  getRequestBlockers(requestId: string): Promise<Blocker[]>;
  
  // Comment operations
  addComment(comment: InsertComment, userId: string): Promise<Comment>;
  getRequestComments(requestId: string): Promise<(Comment & { user: User })[]>;
  
  // Attachment operations
  addAttachment(attachment: InsertAttachment, userId: string): Promise<Attachment>;
  getRequestAttachments(requestId: string): Promise<(Attachment & { uploadedBy: User })[]>;
  getAttachmentByFilePath(filePath: string): Promise<Attachment | undefined>;
  
  // Analytics operations
  getRequestStats(userId: string, role?: string): Promise<{
    totalRequests: number;
    inProgress: number;
    completed: number;
    avgCompletionDays: number;
    overdue: number;
    lateCompletions: number;
    atRisk: number;
    rejected: number;
  }>;
  getDepartmentStats(): Promise<{ department: string; count: number }[]>;
  getTypeStats(): Promise<{ type: string; count: number }[]>;
  getPriorityStats(): Promise<{ priority: string; count: number }[]>;
  getAcceptanceRate(): Promise<{ accepted: number; rejected: number; total: number; acceptanceRate: number }>;
  getBlockedRequestsCount(): Promise<number>;
  getTimeToAssignment(): Promise<number>;
  getCompletionByPriority(): Promise<{
    priority: string;
    total: number;
    completed: number;
    completionRate: number;
  }[]>;
  
  // Task Analytics operations
  getTaskStats(): Promise<{
    totalTasks: number;
    toDo: number;
    inProgress: number;
    blocked: number;
    completed: number;
    avgExpectedTime: number;
  }>;
  getTasksByStatus(): Promise<{ status: string; count: number }[]>;
  getTasksByAssignee(): Promise<{ assignee: string; firstName: string; lastName: string; count: number }[]>;
  getTasksRequestLinked(): Promise<{ linked: string; count: number }[]>;
  getOverdueTasksCount(): Promise<number>;
  getAvgTaskDuration(): Promise<number>;
  getCompletionVelocity(): Promise<{ tasksPerWeek: number; recentCompletions: number }>;
  
  // Auth logging operations
  logAuthEvent(userId: string, eventType: 'signup' | 'signin' | 'signout' | 'password_reset_requested' | 'password_reset_completed', ipAddress?: string, userAgent?: string): Promise<AuthLog>;
  getRecentAuthLogs(limit?: number): Promise<(AuthLog & { user: User })[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Task operations
  createTask(task: InsertTask, createdById: string): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  getTask(id: string): Promise<TaskWithDetails | undefined>;
  getTasks(filters?: {
    status?: string;
    assignedToId?: string;
    createdById?: string;
    requestId?: string;
  }): Promise<TaskWithDetails[]>;
  assignTask(id: string, assignedToId: string): Promise<Task | undefined>;
  updateTaskStatus(id: string, status: string): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  calculatePertTime(optimistic: number, mostLikely: number, pessimistic: number): number;
  getUserWorkload(userId: string): Promise<{ tasks: TaskWithDetails[]; totalExpectedHours: number }>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      // Session table is created by migration, so we don't need createTableIfMissing
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role as any));
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

  async createUser(userData: Partial<User>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData as any)
      .returning();
    return user;
  }

  async getDataAnalysts(): Promise<User[]> {
    return await db.select().from(users).where(
      or(eq(users.role, 'analyst'), eq(users.role, 'team_lead'))
    );
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: string, department?: string): Promise<User | undefined> {
    const updateData: any = { 
      role: role as "requester" | "team_lead" | "analyst",
      updatedAt: new Date() 
    };
    if (department) {
      updateData.department = department;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    // Handle foreign key constraints before deleting user
    
    // 1. Check if user has created any requests (cannot delete if they have)
    const createdRequests = await db
      .select()
      .from(dataRequests)
      .where(eq(dataRequests.requestedById, userId))
      .limit(1);
    
    if (createdRequests.length > 0) {
      throw new Error("Cannot delete user who has created data requests. Please reassign or delete their requests first.");
    }
    
    // 2. Remove user assignments from requests (set to NULL)
    await db
      .update(dataRequests)
      .set({ assignedToId: null })
      .where(eq(dataRequests.assignedToId, userId));
    
    // 3. Remove user as reviewer from requests (set to NULL)
    await db
      .update(dataRequests)
      .set({ reviewedById: null })
      .where(eq(dataRequests.reviewedById, userId));
    
    // 4. Delete user's auth logs (historical data, safe to delete)
    await db.delete(authLogs).where(eq(authLogs.userId, userId));
    
    // 5. Delete user's notifications (safe to delete)
    await db.delete(notifications).where(eq(notifications.userId, userId));
    
    // 6. Delete user's comments (they have non-nullable foreign key)
    await db.delete(comments).where(eq(comments.userId, userId));
    
    // 7. Delete user's attachments (they have non-nullable foreign key)
    await db.delete(attachments).where(eq(attachments.uploadedById, userId));
    
    // 8. Delete user's blockers (they have non-nullable foreign key)
    await db.delete(blockers).where(eq(blockers.reportedById, userId));
    
    // 9. Finally, delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  async createInvitedUser(email: string, role: string, department?: string, firstName?: string, lastName?: string): Promise<User> {
    const userData: UpsertUser = {
      id: `invited-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      email,
      role: role as "requester" | "team_lead" | "analyst",
      department: department || null,
      firstName: firstName || null,
      lastName: lastName || null,
      profileImageUrl: null,
    };

    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updatePasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expires,
      })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password })
      .where(eq(users.id, userId));
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    return user;
  }

  async updateUserPasswordAndName(userId: string, password: string, name: string): Promise<void> {
    // Split name into first and last name (simple split by space)
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || null;

    await db
      .update(users)
      .set({
        password,
        firstName,
        lastName,
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(users.id, userId));
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

  async updateDataRequest(id: string, request: InsertDataRequest): Promise<DataRequest | undefined> {
    const [updatedRequest] = await db
      .update(dataRequests)
      .set({
        ...request,
        updatedAt: new Date(),
      })
      .where(eq(dataRequests.id, id))
      .returning();
    return updatedRequest;
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
        reviewedBy: {
          id: sql`reviewed_user.id`,
          email: sql`reviewed_user.email`,
          firstName: sql`reviewed_user.first_name`,
          lastName: sql`reviewed_user.last_name`,
          profileImageUrl: sql`reviewed_user.profile_image_url`,
          role: sql`reviewed_user.role`,
          department: sql`reviewed_user.department`,
          createdAt: sql`reviewed_user.created_at`,
          updatedAt: sql`reviewed_user.updated_at`,
        },
      })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .leftJoin(sql`users assigned_user`, sql`data_requests.assigned_to_id = assigned_user.id`)
      .leftJoin(sql`users reviewed_user`, sql`data_requests.reviewed_by_id = reviewed_user.id`)
      .where(eq(dataRequests.id, id));

    if (result.length === 0) return undefined;

    const requestData = result[0];
    const requestComments = await this.getRequestComments(id);
    const requestAttachments = await this.getRequestAttachments(id);

    return {
      ...requestData.request,
      requestedBy: requestData.requestedBy,
      assignedTo: requestData.assignedTo.id ? requestData.assignedTo : null,
      reviewedBy: requestData.reviewedBy?.id ? requestData.reviewedBy : null,
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
    startDate?: string;
    endDate?: string;
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
        reviewedBy: {
          id: sql`reviewed_user.id`,
          email: sql`reviewed_user.email`,
          firstName: sql`reviewed_user.first_name`,
          lastName: sql`reviewed_user.last_name`,
          profileImageUrl: sql`reviewed_user.profile_image_url`,
          role: sql`reviewed_user.role`,
          department: sql`reviewed_user.department`,
          createdAt: sql`reviewed_user.created_at`,
          updatedAt: sql`reviewed_user.updated_at`,
        },
      })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .leftJoin(sql`users assigned_user`, sql`data_requests.assigned_to_id = assigned_user.id`)
      .leftJoin(sql`users reviewed_user`, sql`data_requests.reviewed_by_id = reviewed_user.id`)
      .orderBy(desc(dataRequests.createdAt));

    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(dataRequests.status, filters.status as any));
      if (filters.department) conditions.push(eq(dataRequests.department, filters.department));
      if (filters.priority) conditions.push(eq(dataRequests.priority, filters.priority as any));
      if (filters.type) conditions.push(eq(dataRequests.type, filters.type as any));
      if (filters.requestedById) conditions.push(eq(dataRequests.requestedById, filters.requestedById));
      if (filters.assignedToId) conditions.push(eq(dataRequests.assignedToId, filters.assignedToId));
      
      // Date filtering: filter by createdAt timestamp
      if (filters.startDate) {
        conditions.push(sql`${dataRequests.createdAt} >= ${new Date(filters.startDate)}`);
      }
      if (filters.endDate) {
        conditions.push(sql`${dataRequests.createdAt} <= ${new Date(filters.endDate)}`);
      }

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
          reviewedBy: result.reviewedBy?.id ? result.reviewedBy : null,
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
    // First get the current request to track original values
    const [currentRequest] = await db
      .select()
      .from(dataRequests)
      .where(eq(dataRequests.id, id))
      .limit(1);
    
    if (!currentRequest) {
      return undefined;
    }
    
    // Prepare update data - track original values if not already set
    const updateData: any = {
      priority: priority as "p0_critical" | "p1_high" | "p2_medium" | "p3_low",
      dueDate,
      updatedAt: new Date()
    };
    
    // Store original priority if not already stored
    if (!currentRequest.originalPriority) {
      updateData.originalPriority = currentRequest.priority;
    }
    
    // Store original due date if not already stored
    if (!currentRequest.originalDueDate) {
      updateData.originalDueDate = currentRequest.dueDate;
    }
    
    const [updated] = await db
      .update(dataRequests)
      .set(updateData)
      .where(eq(dataRequests.id, id))
      .returning();
    return updated;
  }

  async updateDataRequestType(id: string, type: string): Promise<DataRequest | undefined> {
    const [updated] = await db
      .update(dataRequests)
      .set({ 
        type: type as any,
        updatedAt: new Date()
      })
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

  async getRequestStats(userId: string, role?: string): Promise<{
    totalRequests: number;
    inProgress: number;
    completed: number;
    avgCompletionDays: number;
    overdue: number;
    lateCompletions: number;
    atRisk: number;
    rejected: number;
  }> {
    // Build base filter based on role
    const filters = [];
    if (role === 'requester') {
      filters.push(eq(dataRequests.requestedById, userId));
    } else if (role === 'analyst') {
      filters.push(eq(dataRequests.assignedToId, userId));
    }
    // team_lead sees all requests (no filter)

    const baseFilter = filters.length > 0 ? and(...filters) : undefined;

    // Use INNER JOIN with users table to match getDataRequests behavior
    // This ensures we only count requests with valid users
    const [totalResult] = baseFilter
      ? await db.select({ count: count() })
          .from(dataRequests)
          .innerJoin(users, eq(dataRequests.requestedById, users.id))
          .where(baseFilter)
      : await db.select({ count: count() })
          .from(dataRequests)
          .innerJoin(users, eq(dataRequests.requestedById, users.id));

    const inProgressFilter = baseFilter
      ? and(baseFilter, eq(dataRequests.status, 'in_progress'))
      : eq(dataRequests.status, 'in_progress');
    const [inProgressResult] = await db.select({ count: count() })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .where(inProgressFilter);

    const completedFilter = baseFilter
      ? and(baseFilter, eq(dataRequests.status, 'completed'))
      : eq(dataRequests.status, 'completed');
    const [completedResult] = await db.select({ count: count() })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .where(completedFilter);
    
    // Calculate actual average completion days (from created to delivered)
    const avgCompletionQuery = await db
      .select({ 
        createdAt: dataRequests.createdAt,
        deliveredAt: dataRequests.deliveredAt,
      })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .where(
        baseFilter
          ? and(baseFilter, eq(dataRequests.status, 'completed'), sql`${dataRequests.deliveredAt} IS NOT NULL`)
          : and(eq(dataRequests.status, 'completed'), sql`${dataRequests.deliveredAt} IS NOT NULL`)
      );

    let avgCompletionDays = 0;
    if (avgCompletionQuery.length > 0) {
      const totalDays = avgCompletionQuery.reduce((sum, req) => {
        if (req.createdAt && req.deliveredAt) {
          const days = Math.floor((req.deliveredAt.getTime() - req.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }
        return sum;
      }, 0);
      avgCompletionDays = Math.round(totalDays / avgCompletionQuery.length);
    }

    // Overdue: Requests past deadline and not completed
    const overdueFilter = baseFilter
      ? and(
          baseFilter,
          sql`${dataRequests.dueDate} < NOW()`,
          sql`${dataRequests.status} NOT IN ('completed')`
        )
      : and(
          sql`${dataRequests.dueDate} < NOW()`,
          sql`${dataRequests.status} NOT IN ('completed')`
        );
    const [overdueResult] = await db.select({ count: count() })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .where(overdueFilter);

    // Late Completions: Requests completed after deadline
    const lateCompletionsFilter = baseFilter
      ? and(
          baseFilter,
          eq(dataRequests.status, 'completed'),
          sql`${dataRequests.deliveredAt} > ${dataRequests.dueDate}`
        )
      : and(
          eq(dataRequests.status, 'completed'),
          sql`${dataRequests.deliveredAt} > ${dataRequests.dueDate}`
        );
    const [lateCompletionsResult] = await db.select({ count: count() })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .where(lateCompletionsFilter);

    // At Risk: Requests with deadline less than 1 day and not completed
    const atRiskFilter = baseFilter
      ? and(
          baseFilter,
          sql`${dataRequests.dueDate} BETWEEN NOW() AND NOW() + INTERVAL '1 day'`,
          sql`${dataRequests.status} NOT IN ('completed')`
        )
      : and(
          sql`${dataRequests.dueDate} BETWEEN NOW() AND NOW() + INTERVAL '1 day'`,
          sql`${dataRequests.status} NOT IN ('completed')`
        );
    const [atRiskResult] = await db.select({ count: count() })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .where(atRiskFilter);

    // Rejected: Requests with rejected status
    const rejectedFilter = baseFilter
      ? and(baseFilter, eq(dataRequests.status, 'rejected'))
      : eq(dataRequests.status, 'rejected');
    const [rejectedResult] = await db.select({ count: count() })
      .from(dataRequests)
      .innerJoin(users, eq(dataRequests.requestedById, users.id))
      .where(rejectedFilter);

    return {
      totalRequests: totalResult.count,
      inProgress: inProgressResult.count,
      completed: completedResult.count,
      avgCompletionDays,
      overdue: overdueResult.count,
      lateCompletions: lateCompletionsResult.count,
      atRisk: atRiskResult.count,
      rejected: rejectedResult.count,
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

  async getAcceptanceRate(): Promise<{ accepted: number; rejected: number; total: number; acceptanceRate: number }> {
    // Count requests that have been reviewed (either accepted or rejected)
    const reviewedRequests = await db
      .select({
        status: dataRequests.status,
        reviewedAt: dataRequests.reviewedAt,
        rejectionReason: dataRequests.rejectionReason,
      })
      .from(dataRequests)
      .where(sql`${dataRequests.reviewedAt} IS NOT NULL`);

    const accepted = reviewedRequests.filter(r => 
      r.status !== 'rejected' && r.rejectionReason === null
    ).length;
    
    const rejected = reviewedRequests.filter(r => 
      r.rejectionReason !== null
    ).length;

    const total = reviewedRequests.length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return {
      accepted,
      rejected,
      total,
      acceptanceRate,
    };
  }

  async getBlockedRequestsCount(): Promise<number> {
    // Count requests with unresolved blockers
    const [result] = await db
      .select({ count: count() })
      .from(dataRequests)
      .innerJoin(blockers, eq(blockers.requestId, dataRequests.id))
      .where(eq(blockers.resolved, 'false'));

    return result.count;
  }

  async getTimeToAssignment(): Promise<number> {
    // Calculate average time from submission to assignment
    const assignedRequests = await db
      .select({
        createdAt: dataRequests.createdAt,
        reviewedAt: dataRequests.reviewedAt,
      })
      .from(dataRequests)
      .where(
        and(
          sql`${dataRequests.assignedToId} IS NOT NULL`,
          sql`${dataRequests.reviewedAt} IS NOT NULL`
        )
      );

    if (assignedRequests.length === 0) return 0;

    const totalDays = assignedRequests.reduce((sum, req) => {
      if (req.createdAt && req.reviewedAt) {
        const days = Math.floor((req.reviewedAt.getTime() - req.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }
      return sum;
    }, 0);

    return Math.round(totalDays / assignedRequests.length);
  }

  async getCompletionByPriority(): Promise<{
    priority: string;
    total: number;
    completed: number;
    completionRate: number;
  }[]> {
    const priorities = ['p0_critical', 'p1_high', 'p2_medium', 'p3_low'];
    const priorityLabels: Record<string, string> = {
      'p0_critical': 'P0-Critical',
      'p1_high': 'P1-High',
      'p2_medium': 'P2-Medium',
      'p3_low': 'P3-Low'
    };
    const results = [];

    for (const priority of priorities) {
      const [totalResult] = await db
        .select({ count: count() })
        .from(dataRequests)
        .where(sql`${dataRequests.priority} = ${priority}`);

      const [completedResult] = await db
        .select({ count: count() })
        .from(dataRequests)
        .where(
          and(
            sql`${dataRequests.priority} = ${priority}`,
            eq(dataRequests.status, 'completed')
          )
        );

      const total = totalResult.count;
      const completed = completedResult.count;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      results.push({
        priority: priorityLabels[priority],
        total,
        completed,
        completionRate,
      });
    }

    return results;
  }

  // Task Analytics Methods
  async getTaskStats(): Promise<{
    totalTasks: number;
    toDo: number;
    inProgress: number;
    blocked: number;
    completed: number;
    avgExpectedTime: number;
  }> {
    const allTasks = await db.select().from(tasks);
    
    const totalTasks = allTasks.length;
    const toDo = allTasks.filter(t => t.status === 'to_do').length;
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
    const blocked = allTasks.filter(t => t.status === 'blocked').length;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    
    const tasksWithTime = allTasks.filter(t => t.expectedTime != null);
    const avgExpectedTime = tasksWithTime.length > 0
      ? tasksWithTime.reduce((sum, t) => sum + (t.expectedTime || 0), 0) / tasksWithTime.length
      : 0;

    return {
      totalTasks,
      toDo,
      inProgress,
      blocked,
      completed,
      avgExpectedTime: Number(avgExpectedTime.toFixed(1)),
    };
  }

  async getTasksByStatus(): Promise<{ status: string; count: number }[]> {
    const results = await db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .groupBy(tasks.status);

    return results.map(r => ({ status: r.status, count: r.count }));
  }

  async getTasksByAssignee(): Promise<{ assignee: string; firstName: string; lastName: string; count: number }[]> {
    const results = await db
      .select({
        assignee: tasks.assignedToId,
        firstName: users.firstName,
        lastName: users.lastName,
        count: count(),
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedToId, users.id))
      .where(isNotNull(tasks.assignedToId))
      .groupBy(tasks.assignedToId, users.firstName, users.lastName);

    return results.map(r => ({
      assignee: r.assignee || 'Unassigned',
      firstName: r.firstName || '',
      lastName: r.lastName || '',
      count: r.count,
    }));
  }

  async getTasksRequestLinked(): Promise<{ linked: string; count: number }[]> {
    const allTasks = await db.select().from(tasks);
    
    const requestLinked = allTasks.filter(t => t.requestId != null).length;
    const selfCreated = allTasks.filter(t => t.requestId == null).length;

    return [
      { linked: 'Request-Related', count: requestLinked },
      { linked: 'Self-Created', count: selfCreated },
    ];
  }

  async getTeamWorkload(): Promise<Array<{
    analystId: string;
    firstName: string;
    lastName: string;
    totalTasks: number;
    toDo: number;
    inProgress: number;
    blocked: number;
    completed: number;
    // Add time-based metrics
    totalExpectedHours: number;
    totalExpectedDays: number;
    weeklyCapacity: number;
    currentUtilization: number;
    availableDays: number;
    capacityLevel: 'available' | 'light' | 'moderate' | 'heavy' | 'overloaded';
  }>> {
    // Get all analysts
    const analysts = await db
      .select()
      .from(users)
      .where(eq(users.role, 'analyst'));

    const workload = await Promise.all(
      analysts.map(async (analyst) => {
        // Get task counts by status for this analyst
        const statusCounts = await db
          .select({
            status: tasks.status,
            count: count(),
          })
          .from(tasks)
          .where(eq(tasks.assignedToId, analyst.id))
          .groupBy(tasks.status);

        // Get time-based metrics for active tasks
        const activeTasks = await db
          .select({
            expectedTime: tasks.expectedTime,
          })
          .from(tasks)
          .where(
            and(
              eq(tasks.assignedToId, analyst.id),
              inArray(tasks.status, ['to_do', 'in_progress', 'blocked'])
            )
          );

        const statusMap = statusCounts.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>);

        const totalTasks = statusCounts.reduce((sum, item) => sum + item.count, 0);
        
        // Calculate time-based workload using 6-hour days
        const totalExpectedHours = activeTasks.reduce((sum, task) => 
          sum + (task.expectedTime || 0), 0);
        
        // Convert to days using 6-hour standard
        const totalExpectedDays = Math.ceil(totalExpectedHours / 6);
        
        // Weekly capacity: 5 working days per week
        const weeklyCapacity = 5;
        const currentUtilization = (totalExpectedDays / weeklyCapacity) * 100;
        const availableDays = Math.max(0, weeklyCapacity - totalExpectedDays);

        // Smart capacity assessment based on days
        const capacityLevel = totalExpectedDays === 0 ? 'available' :
                             currentUtilization <= 20 ? 'light' :
                             currentUtilization <= 60 ? 'moderate' :
                             currentUtilization <= 80 ? 'heavy' : 'overloaded';

        return {
          analystId: analyst.id,
          firstName: analyst.firstName || '',
          lastName: analyst.lastName || '',
          totalTasks,
          toDo: statusMap['to_do'] || 0,
          inProgress: statusMap['in_progress'] || 0,
          blocked: statusMap['blocked'] || 0,
          completed: statusMap['completed'] || 0,
          // Time-based metrics
          totalExpectedHours,
          totalExpectedDays,
          weeklyCapacity,
          currentUtilization,
          availableDays,
          capacityLevel,
        };
      })
    );

    return workload.sort((a, b) => b.totalExpectedDays - a.totalExpectedDays);
  }

  async getOverdueTasksCount(): Promise<number> {
    // Count tasks past due date and not completed
    const [result] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          sql`${tasks.dueDate} < NOW()`,
          sql`${tasks.status} != 'completed'`,
          isNotNull(tasks.dueDate)
        )
      );

    return result.count;
  }

  async getAvgTaskDuration(): Promise<number> {
    // Calculate average time from creation to completion
    const completedTasks = await db
      .select({
        createdAt: tasks.createdAt,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'completed'),
          isNotNull(tasks.completedAt)
        )
      );

    if (completedTasks.length === 0) return 0;

    const totalDays = completedTasks.reduce((sum, task) => {
      if (task.createdAt && task.completedAt) {
        const days = Math.floor((task.completedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }
      return sum;
    }, 0);

    return Math.round(totalDays / completedTasks.length);
  }

  async getCompletionVelocity(): Promise<{ tasksPerWeek: number; recentCompletions: number }> {
    // Get tasks completed in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompletedTasks = await db
      .select({
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.status, 'completed'),
          sql`${tasks.completedAt} >= ${thirtyDaysAgo}`,
          isNotNull(tasks.completedAt)
        )
      );

    const recentCompletions = recentCompletedTasks.length;
    const tasksPerWeek = Math.round((recentCompletions / 30) * 7);

    return {
      tasksPerWeek,
      recentCompletions,
    };
  }

  async deleteDataRequest(id: string): Promise<void> {
    await db.delete(dataRequests).where(eq(dataRequests.id, id));
  }

  async purgeAllRequests(): Promise<{ deleted: number }> {
    const [countResult] = await db.select({ count: count() }).from(dataRequests);
    const total = countResult.count;
    
    await db.delete(comments);
    await db.delete(attachments);
    await db.delete(dataRequests);
    
    return { deleted: total };
  }

  async fixDeliveredRequestsStatus(): Promise<{ updated: number; requestIds: string[] }> {
    const requests = await db
      .update(dataRequests)
      .set({
        status: 'completed',
        updatedAt: new Date()
      })
      .where(sql`${dataRequests.deliveredAt} IS NOT NULL AND ${dataRequests.status} != 'completed'`)
      .returning({ id: dataRequests.id });
    
    return {
      updated: requests.length,
      requestIds: requests.map(r => r.id)
    };
  }

  // New three-role workflow implementations
  async acceptRequest(id: string, reviewerId: string): Promise<DataRequest | undefined> {
    const [request] = await db
      .update(dataRequests)
      .set({
        status: 'accepted',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: null,
      })
      .where(eq(dataRequests.id, id))
      .returning();
    return request;
  }

  async rejectRequest(id: string, reviewerId: string, rejectionReason: string): Promise<DataRequest | undefined> {
    const [request] = await db
      .update(dataRequests)
      .set({
        status: 'rejected',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionReason,
      })
      .where(eq(dataRequests.id, id))
      .returning();
    return request;
  }

  async assignToAnalyst(id: string, analystId: string, dueDate?: Date): Promise<DataRequest | undefined> {
    const [request] = await db
      .update(dataRequests)
      .set({
        status: 'in_progress', // Automatically set to In Progress when assigned
        assignedToId: analystId,
        dueDate: dueDate || undefined,
        workStartedAt: new Date(), // Record when work started
      })
      .where(eq(dataRequests.id, id))
      .returning();
    
    // Auto-create a task for the analyst when request is assigned
    if (request) {
      await db.insert(tasks).values({
        title: `Request #${request.requestNumber}: ${request.title}`,
        description: `Work on ${request.type} request`,
        status: 'to_do',
        assignedToId: analystId,
        requestId: request.id,
        createdById: analystId,
        dueDate: dueDate || undefined,
        updatedAt: new Date(),
      });
    }
    
    return request;
  }

  async suggestDeadline(id: string, suggestedDeadline: Date): Promise<DataRequest | undefined> {
    const [request] = await db
      .update(dataRequests)
      .set({
        suggestedDeadline,
      })
      .where(eq(dataRequests.id, id))
      .returning();
    return request;
  }

  async completeRequest(id: string): Promise<DataRequest | undefined> {
    const [request] = await db
      .update(dataRequests)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(dataRequests.id, id))
      .returning();
    return request;
  }

  async deliverRequest(id: string, deliveryType: string, deliveryLink?: string, deliveryContent?: string, deliveryFileUrl?: string, deliveryFileName?: string): Promise<DataRequest | undefined> {
    const updateData: any = {
      deliveryType,
      deliveredAt: new Date(),
      updatedAt: new Date(),
      status: 'completed', // Automatically set status to completed when delivery is made
    };
    
    // Set appropriate fields based on delivery type
    if (deliveryType === 'link') {
      updateData.deliveryLink = deliveryLink || null;
      updateData.deliveryContent = null;
      updateData.deliveryFileUrl = null;
      updateData.deliveryFileName = null;
    } else if (deliveryType === 'text') {
      updateData.deliveryContent = deliveryContent || null;
      updateData.deliveryLink = null;
      updateData.deliveryFileUrl = null;
      updateData.deliveryFileName = null;
    } else if (deliveryType === 'attachment') {
      updateData.deliveryFileUrl = deliveryFileUrl || null;
      updateData.deliveryFileName = deliveryFileName || null;
      updateData.deliveryLink = null;
      updateData.deliveryContent = null;
    }
    
    const [request] = await db
      .update(dataRequests)
      .set(updateData)
      .where(eq(dataRequests.id, id))
      .returning();
    return request;
  }

  // Blocker operations
  async addBlocker(requestId: string, description: string, reportedById: string): Promise<Blocker> {
    const [blocker] = await db
      .insert(blockers)
      .values({
        requestId,
        description,
        reportedById,
        resolved: 'false',
      })
      .returning();
    
    // Update request status to blocked
    await db
      .update(dataRequests)
      .set({ status: 'blocked' })
      .where(eq(dataRequests.id, requestId));
    
    return blocker;
  }

  async getRequestBlockers(requestId: string): Promise<Blocker[]> {
    return await db
      .select()
      .from(blockers)
      .where(eq(blockers.requestId, requestId))
      .orderBy(desc(blockers.createdAt));
  }

  // Auth logging operations
  async logAuthEvent(
    userId: string, 
    eventType: 'signup' | 'signin' | 'signout' | 'password_reset_requested' | 'password_reset_completed', 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<AuthLog> {
    const [log] = await db
      .insert(authLogs)
      .values({
        userId,
        eventType,
        ipAddress,
        userAgent,
      })
      .returning();
    return log;
  }

  async getRecentAuthLogs(limit: number = 100): Promise<(AuthLog & { user: User })[]> {
    const results = await db
      .select({
        log: authLogs,
        user: users,
      })
      .from(authLogs)
      .leftJoin(users, eq(authLogs.userId, users.id))
      .orderBy(desc(authLogs.createdAt))
      .limit(limit);

    return results.map(r => ({
      ...r.log,
      user: r.user!,
    }));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [notif] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return notif;
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const conditions = unreadOnly 
      ? and(eq(notifications.userId, userId), eq(notifications.read, 'false'))
      : eq(notifications.userId, userId);
    
    return await db
      .select()
      .from(notifications)
      .where(conditions)
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ read: 'true' })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: 'true' })
      .where(and(eq(notifications.userId, userId), eq(notifications.read, 'false')));
  }

  // Task operations
  calculatePertTime(optimistic: number, mostLikely: number, pessimistic: number): number {
    // PERT formula: (O + 4M + P) / 6
    return (optimistic + (4 * mostLikely) + pessimistic) / 6;
  }

  async createTask(task: InsertTask, createdById: string): Promise<Task> {
    // Calculate expected time if PERT values are provided
    let expectedTime: number | undefined;
    if (task.optimisticTime !== undefined && task.optimisticTime !== null && 
        task.mostLikelyTime !== undefined && task.mostLikelyTime !== null &&
        task.pessimisticTime !== undefined && task.pessimisticTime !== null) {
      expectedTime = this.calculatePertTime(
        Number(task.optimisticTime), 
        Number(task.mostLikelyTime), 
        Number(task.pessimisticTime)
      );
    }

    const [newTask] = await db
      .insert(tasks)
      .values({
        ...task,
        createdById,
        expectedTime,
        updatedAt: new Date(),
      })
      .returning();
    return newTask;
  }

  async updateTask(id: string, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    // Recalculate expected time if PERT values are updated
    let expectedTime: number | undefined;
    const currentTask = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    
    if (currentTask.length > 0) {
      const optimistic = taskUpdate.optimisticTime !== undefined ? taskUpdate.optimisticTime : currentTask[0].optimisticTime;
      const mostLikely = taskUpdate.mostLikelyTime !== undefined ? taskUpdate.mostLikelyTime : currentTask[0].mostLikelyTime;
      const pessimistic = taskUpdate.pessimisticTime !== undefined ? taskUpdate.pessimisticTime : currentTask[0].pessimisticTime;
      
      if (optimistic !== undefined && optimistic !== null && 
          mostLikely !== undefined && mostLikely !== null && 
          pessimistic !== undefined && pessimistic !== null) {
        expectedTime = this.calculatePertTime(Number(optimistic), Number(mostLikely), Number(pessimistic));
      }
    }

    // Build the update object with proper type conversions
    const updateData: Record<string, any> = {};
    
    // Convert dueDate to Date object if it's a string
    if (taskUpdate.dueDate !== undefined) {
      if (taskUpdate.dueDate === null) {
        updateData.dueDate = null;
      } else if (typeof taskUpdate.dueDate === 'string') {
        updateData.dueDate = new Date(taskUpdate.dueDate);
      } else {
        updateData.dueDate = taskUpdate.dueDate;
      }
    }
    
    // Copy over other fields
    Object.keys(taskUpdate).forEach(key => {
      if (key !== 'dueDate') {
        updateData[key] = taskUpdate[key as keyof typeof taskUpdate];
      }
    });

    const [updated] = await db
      .update(tasks)
      .set({
        ...updateData,
        ...(expectedTime !== undefined && { expectedTime }),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async getTask(id: string): Promise<TaskWithDetails | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!task) return undefined;

    // Get assignedTo user
    const assignedTo = task.assignedToId 
      ? (await this.getUser(task.assignedToId)) || null
      : null;

    // Get createdBy user
    const createdBy = (await this.getUser(task.createdById))!;

    // Get request
    const request = task.requestId
      ? await db.select().from(dataRequests).where(eq(dataRequests.id, task.requestId)).limit(1).then(r => r[0] || null)
      : null;

    return {
      ...task,
      assignedTo,
      createdBy: createdBy!,
      request,
    };
  }

  async getTasks(filters?: {
    status?: string;
    assignedToId?: string;
    createdById?: string;
    requestId?: string;
  }): Promise<TaskWithDetails[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status as any));
    }
    if (filters?.assignedToId) {
      conditions.push(eq(tasks.assignedToId, filters.assignedToId));
    }
    if (filters?.createdById) {
      conditions.push(eq(tasks.createdById, filters.createdById));
    }
    if (filters?.requestId) {
      conditions.push(eq(tasks.requestId, filters.requestId));
    }

    const query = db
      .select()
      .from(tasks)
      .orderBy(sql`${tasks.dueDate} ASC NULLS LAST`);

    const taskList = conditions.length > 0 
      ? await query.where(and(...conditions))
      : await query;

    // Fetch related data for each task
    const tasksWithDetails = await Promise.all(
      taskList.map(async (task) => {
        const assignedTo = task.assignedToId 
          ? (await this.getUser(task.assignedToId)) || null
          : null;
        const createdBy = (await this.getUser(task.createdById))!;
        const request = task.requestId
          ? await db.select().from(dataRequests).where(eq(dataRequests.id, task.requestId)).limit(1).then(r => r[0] || null)
          : null;

        return {
          ...task,
          assignedTo,
          createdBy,
          request,
        };
      })
    );

    return tasksWithDetails;
  }

  async assignTask(id: string, assignedToId: string): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({
        assignedToId,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async updateTaskStatus(id: string, status: string): Promise<Task | undefined> {
    const updateData: any = {
      status: status as any,
      updatedAt: new Date(),
    };

    // If marking as completed, set completedAt
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getUserWorkload(userId: string): Promise<{ tasks: TaskWithDetails[]; totalExpectedHours: number }> {
    const userTasks = await this.getTasks({ assignedToId: userId });
    
    // Filter out completed tasks and calculate total expected hours
    const activeTasks = userTasks.filter(t => t.status !== 'completed');
    const totalExpectedHours = activeTasks.reduce((sum, task) => {
      return sum + (task.expectedTime || 0);
    }, 0);

    return {
      tasks: userTasks,
      totalExpectedHours,
    };
  }

  // Sub-task methods
  async getSubTasks(parentTaskId: string): Promise<TaskWithDetails[]> {
    const subTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTaskId))
      .orderBy(sql`${tasks.dueDate} ASC NULLS LAST`);

    const subTasksWithDetails = await Promise.all(
      subTasks.map(async (task) => {
        const assignedTo = task.assignedToId 
          ? (await this.getUser(task.assignedToId)) || null
          : null;
        const createdBy = (await this.getUser(task.createdById))!;
        const request = task.requestId
          ? await db.select().from(dataRequests).where(eq(dataRequests.id, task.requestId)).limit(1).then(r => r[0] || null)
          : null;

        return {
          ...task,
          assignedTo,
          createdBy,
          request,
        };
      })
    );

    return subTasksWithDetails;
  }

  async getSubTaskProgress(parentTaskId: string): Promise<{ total: number; completed: number }> {
    const subTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentTaskId, parentTaskId));

    const total = subTasks.length;
    const completed = subTasks.filter(t => t.status === 'completed').length;

    return { total, completed };
  }
}

export const storage = new DatabaseStorage();
