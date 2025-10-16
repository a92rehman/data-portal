# DataHub - Data Request Management System

## Overview

DataHub is a full-stack data request management system designed to streamline data request and analytics workflows. It facilitates data request submission by team leads and efficient management, review, and completion by data analysts. The system offers features such as request tracking with status management, commenting, email/password authentication, task management with PERT time estimation, and comprehensive analytics dashboards. Built with React, shadcn/ui, Express, and PostgreSQL, DataHub aims to provide a modern, responsive user experience, improve transparency in data operations, and deliver actionable insights.

## Recent Changes (October 16, 2025)

### Request Assignment Fix
- Fixed Request Assignments page for analysts to show only requests where they are assigned (assignedToId = analyst.id)
- Previously showed all requests regardless of assignment status

### Task Auto-Completion
- Implemented automatic task completion when parent request is delivered or completed
- When a request status changes to "delivered" or "completed", all linked tasks (via task.requestId) automatically mark as completed
- Added error handling to prevent delivery/completion failures if task auto-complete fails
- Logic added to both `/api/requests/:id/delivered` and `/api/requests/:id/complete` endpoints

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
- `dataRequests`: Request details, status, priority, requester, assignee, delivery info.
- `tasks`: Task tracking with PERT time estimation, Kanban status, request linkage.
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
  - **Data Lead**: View all requests, accept/reject, assign/unassign analysts, set priority/deadline, manage team.
  - **Analyst**: View assigned requests only, add blockers, update status.
- **Security Enforcements**: Prevents privilege escalation, enforces role preservation, filters requests based on role, validates company email domains, restricts role assignment to Data Leads.
- Analytics view restricted to Data Lead only.

### API Structure

**RESTful Endpoints:**
- User management: `/api/auth/user`, `/api/auth/user/role`, `/api/auth/user/department`, `/api/auth/user/email`, `/api/auth/user/name`, `/api/auth/user/password`
- Analyst listing: `/api/users/analysts`
- Request management: `/api/requests`, `/api/requests/:id`, `/api/requests/:id/status`, `/api/requests/:id/assign`, `/api/requests/:id/priority-deadline`, `/api/requests/:id/delivery`
- Task management: `/api/tasks`, `/api/tasks/:id`, `/api/tasks/:id/status`
- Content: `/api/requests/:id/attachments`, `/api/requests/:id/comments`
- File upload: `/api/objects/upload`
- Analytics: `/api/analytics/*` (requests and tasks analytics)
- Auth logs: `/api/auth-logs`

**API Design Patterns:**
- Authentication middleware, Zod schema validation, consistent error handling.

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
- **File Upload**: Uppy with AWS S3 plugin using pre-signed URLs (max 5 files, 10MB each).