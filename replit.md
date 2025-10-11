# DataHub - Data Request Management System

## Overview

This is a full-stack data request management system for managing data requests and analytics workflows. It enables team leads to submit data requests and data analysts to manage, review, and complete them. The system provides request tracking with status management, commenting, email/password authentication, and analytics dashboards. It is built with React, shadcn/ui, Express, and PostgreSQL, focusing on a modern, responsive user experience. The business vision is to streamline data request workflows, improve transparency, and provide actionable insights into data operations.

## Recent Changes

**October 11, 2025 - Test Email Support for Production Testing**
- Added test email support for production testing purposes
- Test emails: ar09info@gmail.com (requester), ar92info@gmail.com (analyst)
- Created isAllowedRequesterEmail() helper function in backend to centralize email validation
- Updated frontend signup validation to accept test emails
- Updated backend validation in 4 locations: role changes, email updates, invites, role selection
- Test emails bypass company domain requirements for testing all workflows

**October 11, 2025 - Request Detail Dialog Enhancements**
- Made dialog fullscreen (98vw x 98vh) for better visibility
- Added back button with ArrowLeft icon to dialog header
- Improved header text alignment with flex layout
- Updated information tile colors to be more vibrant and visible:
  - Light mode: solid colors (purple-200, blue-200, green-200, orange-200)
  - Dark mode: solid colors (purple-700, blue-700, green-700, orange-700)
  - Enhanced borders and text contrast for better readability

**October 10, 2025 - Extended Request Types and Form Fields**
- Added new request types: BigQuery Access, Event Tracking, Metric Change, Pipeline Change, Recurring Report
- Added team/sub-department field to data requests for better organizational tracking
- Enhanced data bug request type with dedicated fields for bug description and location
- Created type-specific form sections with collapsible UI for each new request type:
  - BigQuery Access: email, datasets, and purpose fields
  - Data Bug: bug description and location fields
  - Event Tracking: event name, platform, and tracking details
  - Metric Change: metric name, change type, and reason
  - Pipeline Change: pipeline name, change type, and details
- Updated database schema with new columns for all type-specific fields
- Auto-populates department field from user profile on new requests

**October 10, 2025 - Settings Page Enhancements**
- Added email editing capability to Settings page with email format validation and duplicate email checking
- Added username (firstName/lastName) editing capability to Settings page
- Fixed dark mode to apply globally across all screens by correcting CSS selector from `body.dark` to `.dark body`
- Added theme initialization in App.tsx to load saved theme preference from localStorage on app startup
- Created backend API endpoints: `/api/auth/user/email` and `/api/auth/user/name` with proper validation
- Theme persistence now works correctly across page reloads

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
- **Authentication Flow**: Email/password authentication with role-based access. Authenticated users redirected from /auth to dashboard to prevent 404 errors.
- **Form Validation**: Zod schemas for consistent client and server-side validation.
- **Routing**: Wouter-based routing with authenticated/unauthenticated route separation and proper redirect handling.

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
- `GET /api/auth/user`, `PATCH /api/auth/user/role`, `PATCH /api/auth/user/department`, `PATCH /api/auth/user/email`, `PATCH /api/auth/user/name`, `PATCH /api/auth/user/password`
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