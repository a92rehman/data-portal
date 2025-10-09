# DataHub - Data Request Management System

## Overview

This is a full-stack data request management system for managing data requests and analytics workflows. It enables team leads to submit data requests and data analysts to manage, review, and complete them. The system provides request tracking with status management, commenting, email/password authentication, and analytics dashboards. It is built with React, shadcn/ui, Express, and PostgreSQL, focusing on a modern, responsive user experience. The business vision is to streamline data request workflows, improve transparency, and provide actionable insights into data operations.

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
- **Component Architecture**: Reusable UI components and domain-specific custom components.
- **State Management Pattern**: Server state managed via React Query with aggressive caching; queries invalidated on mutations.
- **Authentication Flow**: Role selection on landing page, Replit Auth login, role application, and profile setup for team leads without a department.
- **Form Validation**: Zod schemas for consistent client and server-side validation.

### Backend Architecture

**Technology Stack:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM with Neon serverless PostgreSQL
- **Authentication**: Passport.js with Local Strategy (email/password)
- **Session Management**: express-session with connect-pg-simple
- **Password Hashing**: Node.js scrypt with per-user salts

**Design Decisions:**
- **Modular Route Structure**: Centralized API routes with authentication middleware.
- **Storage Abstraction**: `IStorage` interface for database operations.
- **Session Persistence**: PostgreSQL-backed sessions.

### Database Schema

**Core Tables:**
- **users**: User profiles, roles, departments.
- **dataRequests**: Data request details (title, type, priority, status, requester, assignee).
- **attachments**: File attachment metadata.
- **comments**: Threaded discussions on requests.
- **blockers**: Tracks issues on requests.
- **auth_logs**: Authentication events (signin, signup, signout, IP, user agent).
- **sessions**: PostgreSQL-backed session storage.

**Key Relationships:**
- One-to-many: Users to data requests, data requests to attachments, data requests to comments.

**Enums:**
- Request status: `submitted`, `under_review`, `in_progress`, `completed`
- Request priority: `P0-Critical`, `P1-High`, `P2-Medium`, `P3-Low`
- Request type: `New Dashboard/Report`, `Modify Dashboard/Report`, `Ad-hoc Analysis`, `Data Extraction`, `Data Bug`, `Other`
- User roles: `team_lead`, `data_analyst`

### Authentication & Authorization

**Email/Password Authentication:**
- Passport.js with Local Strategy for email/password authentication.
- Password hashing using Node.js scrypt with per-user salts.
- User information and credentials stored in PostgreSQL.
- Cookie-based sessions with express-session.

**Onboarding Flow:**
1. **For Requesters (self-signup)**:
   - Role selection on landing page ("Data Requester")
   - Email/password signup with company email validation (@taleemabad.com, @niete.edu.pk, @niete.pk)
   - Department selection
   - Auto-login and redirection to dashboard

2. **For Analysts (invitation-only)**:
   - Data Lead invites analyst via team management interface
   - System sends password setup email with secure 24-hour token
   - Analyst clicks link, sets password and name
   - Auto-login and redirection to dashboard
   - Cannot self-signup (invitation required)

3. **For Data Leads (bootstrap)**:
   - Primary Data Lead (abdur.rehman@taleemabad.com) is protected
   - Additional Data Leads can only be added by existing Data Leads
   - Cannot self-select role from landing page

**Authorization Model:**
- **Role-based access control**:
  - **Requester**: View own requests only (filtered by requestedById). **Requires company email** (@taleemabad.com or @niete.edu.pk).
  - **Data Lead**: View ALL requests, accept/reject, **exclusively assign/unassign analysts**, set priority/deadline, manage team members (add/remove users, change roles).
  - **Analyst**: View assigned requests only (filtered by assignedToId), add blockers, suggest deadlines, update status. **Added by Data Lead only** (no self-signup).
- **Security Enforcements**:
  - **Role Preservation**: Existing users' roles preserved on re-authentication; new users start with undefined role
  - **Privilege Escalation Prevention**: 
    - Team Lead role cannot be self-selected from landing page (only assigned by existing Data Leads)
    - Users with roles cannot change their own role (must be changed by Data Lead)
  - **Request Filtering**: 
    - Requesters see ONLY their own requests (backend enforces requestedById filter)
    - Analysts see ONLY assigned requests (backend enforces assignedToId filter)
    - Team Leads see ALL requests (no filtering applied)
  - **Email Validation**: Requester role restricted to company email domains (@taleemabad.com and @niete.edu.pk)
  - **Role Assignment**: Only Data Lead can assign/modify user roles via team management interface
- Analytics view restricted to Data Lead only.

### API Structure

**RESTful Endpoints:**
- `GET /api/auth/user`, `PATCH /api/auth/user/role`, `PATCH /api/auth/user/department`
- `GET /api/users/analysts`
- `POST /api/requests`, `GET /api/requests`, `GET /api/requests/:id`
- `PATCH /api/requests/:id/status`, `PATCH /api/requests/:id/assign`, `PATCH /api/requests/:id/priority-deadline`
- `POST /api/requests/:id/attachments`, `POST /api/requests/:id/comments`, `GET /api/requests/:id/comments`
- `POST /api/objects/upload`
- `GET /api/analytics/*`
- `GET /api/auth-logs`

**API Design Patterns:**
- Authentication middleware.
- Zod schema validation.
- Consistent error handling and JSON response format.

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
- **Limits**: Max 5 files, 10MB per file.