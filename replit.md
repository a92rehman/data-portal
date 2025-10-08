# Taleemabad Data Request Management System

## Overview

This is a full-stack data request management system for Taleemabad team members. It enables team leads to submit data requests and data analysts to manage, review, and complete them. The system provides request tracking with status management, commenting, authentication via Replit Auth, and analytics dashboards. It is built with React, shadcn/ui, Express, and PostgreSQL, focusing on a modern, responsive user experience. The business vision is to streamline data request workflows, improve transparency, and provide actionable insights into data operations.

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
- **Authentication**: Replit Auth with OpenID Connect (OIDC)
- **Session Management**: express-session with connect-pg-simple

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

**Replit Auth Integration:**
- OpenID Connect (OIDC) with Passport.js strategy.
- User information stored in PostgreSQL.
- Cookie-based sessions.

**Onboarding Flow:**
1. Role selection ("Data Analyst" or "Other Teams").
2. Replit Auth.
3. Role applied to user profile.
4. Team leads without department redirected to profile setup.
5. Department selection for team leads.
6. Redirection to dashboard.

**Authorization Model:**
- **Role-based access control**:
  - **Requester**: View own requests.
  - **Data Lead**: View all requests, accept/reject, assign, set priority/deadline.
  - **Analyst**: View assigned requests, add blockers, suggest deadlines, update status.
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

**Authentication Service:**
- **Replit Auth**: OIDC-based authentication.

**UI Component Library:**
- **shadcn/ui**: Accessible components built on Radix UI.
- **Radix UI**: Unstyled, accessible primitives.
- **Tailwind CSS**: Utility-first CSS framework.

**Object Storage:**
- **Replit Object Storage**: Cloud storage for file attachments (Google Cloud Storage backend).
- **File Upload**: Uppy with AWS S3 plugin using pre-signed URLs.
- **Limits**: Max 5 files, 10MB per file.