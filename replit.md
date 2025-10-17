# DataHub - Data Request Management System

## Overview

DataHub is a full-stack data request management system that streamlines data request and analytics workflows. It enables team leads to submit data requests and data analysts to efficiently manage, review, and complete them. Key capabilities include request tracking with status management, commenting, email/password authentication, task management with PERT time estimation, and comprehensive analytics dashboards. Built with React, shadcn/ui, Express, and PostgreSQL, DataHub aims to provide a modern, responsive user experience, enhance transparency in data operations, and deliver actionable insights.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI Components**: shadcn/ui built on Radix UI
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation

**Design Decisions:**
- Reusable component architecture.
- Server state managed via React Query with aggressive caching and mutation-based invalidation.
- Email/password authentication with role-based access and redirection handling.
- Zod schemas for consistent form validation.
- Compact UI designs for comments and task sections.
- Redesigned task cards with a two-section layout and enhanced subtask display.
- Automatic status change to "in_progress" upon assignment.
- Visual status history timeline for request progression.
- Data Lead exclusive editing for task due dates.
- Subtasks have independent due dates.
- Automatic task completion when the parent request is delivered or completed.

### Backend Architecture

**Technology Stack:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM with Neon serverless PostgreSQL
- **Authentication**: Passport.js with Local Strategy (email/password)
- **Session Management**: express-session with connect-pg-simple
- **Password Hashing**: Node.js scrypt with per-user salts

**Design Decisions:**
- Modular route structure with centralized authentication middleware.
- `IStorage` interface for database operations.
- PostgreSQL-backed session persistence.

### Database Schema

**Core Tables:**
- `users`: User profiles, roles, departments.
- `dataRequests`: Request details, status, priority, requester, assignee, delivery info, `workStartedAt`.
- `tasks`: Task tracking with Kanban status, request linkage, `dueDate`.
- `attachments`: File metadata.
- `comments`: Threaded discussions.
- `blockers`: Tracks request issues.
- `auth_logs`: Authentication events.
- `sessions`: Session storage.

**Key Relationships:**
- One-to-many: Users to data requests, data requests to attachments, data requests to comments.

**Enums:**
- Request status: `submitted`, `under_review`, `in_progress`, `completed`, `pending_review`
- Request priority: `P0-Critical`, `P1-High`, `P2-Medium`, `P3-Low`
- Request type: `New Dashboard/Report`, `Modify Dashboard/Report`, `Ad-hoc Analysis`, `Data Extraction`, `Data Bug`, `Other`, `BigQuery Access`, `Event Tracking`, `Metric Change`, `Pipeline Change`, `Recurring Report`
- User roles: `team_lead`, `data_analyst`

### Authentication & Authorization

**Email/Password Authentication:**
- Passport.js with Local Strategy.
- Node.js scrypt for password hashing with per-user salts.
- Cookie-based sessions.

**Onboarding Flow:**
- **Requesters**: Self-signup with company email validation, department selection, auto-login.
- **Analysts**: Invitation-only by Data Lead, password setup via secure token.
- **Data Leads**: Bootstrap for primary Data Lead, additional Data Leads added by existing Data Leads only.

**Authorization Model:**
- **Role-based Access Control**:
  - **Requester**: View own requests (company email required).
  - **Data Lead**: View all requests, accept/reject, assign/unassign analysts, set priority/deadline, manage team, edit task due dates.
  - **Analyst**: View assigned requests only, add blockers, update status, reassign subtasks.
- **Security Enforcements**: Prevents privilege escalation, enforces role preservation, filters requests based on role, validates company email domains, restricts role assignment to Data Leads.
- Analytics view restricted to Data Lead only.
- Tasks auto-assign to creator. Only Data Leads can reassign main tasks.

### API Structure

**RESTful Endpoints:**
- User management, Analyst listing
- Request management (including status updates, assignment, priority, deadline, delivery)
- Task management (including status updates and assignment)
- Content management (attachments, comments)
- File upload
- Analytics
- Auth logs

**API Design Patterns:**
- Authentication middleware, Zod schema validation, consistent error handling.

### Email & Notification System

**Email Services:**
- **EmailJS** (Client-side): For sending analyst credentials (new and re-added).
- **Brevo** (Server-side): For team member invitations (Data Lead, Requester), request assignments, acceptance/rejection, and delivery notifications.

**Email Flows:**
1. **Analyst Invitation**: Backend generates password, frontend sends credentials via EmailJS.
2. **Team Lead/Requester Invitation**: Backend sends invitation email via Brevo.
3. **Request Notifications**: Assignment, acceptance/rejection, and delivery emails sent via Brevo.

**In-App Notifications:**
- Real-time WebSocket notifications.
- Persistent notifications in `notifications` table.
- Notification types: request assignments, status changes, comments.
- Unread count and mark as read functionality.

## External Dependencies

**Database:**
- **Neon Serverless PostgreSQL**: Serverless PostgreSQL with WebSocket support.
- **Connection Pooling**: `@neondatabase/serverless` with `pg.Pool`.
- **Migration Strategy**: Drizzle Kit.

**UI Component Library:**
- **shadcn/ui**: Accessible components built on Radix UI.
- **Radix UI**: Unstyled, accessible primitives.
- **Tailwind CSS**: Utility-first CSS framework.

**Object Storage:**
- **Replit Object Storage**: Cloud storage for file attachments (Google Cloud Storage backend).
- **File Upload**: Uppy with AWS S3 plugin using pre-signed URLs.