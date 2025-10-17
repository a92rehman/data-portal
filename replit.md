# DataHub - Data Request Management System

## Overview

DataHub is a full-stack data request management system designed to streamline data request and analytics workflows. It facilitates data request submission by team leads and efficient management, review, and completion by data analysts. The system offers features such as request tracking with status management, commenting, email/password authentication, task management with PERT time estimation, and comprehensive analytics dashboards. Built with React, shadcn/ui, Express, and PostgreSQL, DataHub aims to provide a modern, responsive user experience, improve transparency in data operations, and deliver actionable insights.

## Recent Changes (October 17, 2025)

### Subtask Due Date Feature (Latest)
- **Independent Due Date Selection**: Added due date field to subtask creation form
  - Subtasks now have their own independent due dates (not inherited from parent task)
  - Optional date picker added to SubTaskForm between description and status fields
  - Date properly saved to database via dueDate field in tasks table
  - Test ID: `input-subtask-due-date` for automated testing

### Team Tasks UI Overhaul
- **Removed PERT Time Display**: Eliminated time clock (expected time) from all task displays since PERT calculation was removed
- **Removed Order Numbers**: Removed order badges (#1, #2, etc.) for cleaner visual hierarchy
- **Clickable Request Badge**: Made request task badge clickable to directly open linked request details
  - Shows as interactive button with "Request #XXX" and external link icon
  - Click triggers request detail modal with full context
- **Enhanced Tile Layout**: Completely redesigned task cards for improved UX
  - Two-section layout: top (title/badges/view button), bottom (metadata grid)
  - Larger, more prominent task titles (text-xl)
  - Icon-based metadata display with circular colored backgrounds
  - Hover effects with border color changes and shadow transitions
  - Rounded corners (rounded-xl) for modern appearance
- **Improved Subtask Display**: Redesigned subtask section
  - Clear "SUBTASKS (N)" header with corner-down-right icon
  - Gradient background cards for better visual separation
  - Compact horizontal layout with status dropdown and view button
  - Removed time display from subtasks as well
- **NEW Badge Enhancement**: Added sparkle emoji (✨) to NEW badge for tasks created in last 24 hours
- **Consistent Styling**: Applied gradient backgrounds, better spacing, and improved dark mode support throughout

### UI Improvements - Compact Design & Task Section Redesign
- **Comments Section**: Redesigned with ultra-compact vertical table layout
  - Removed horizontal card tiles, now uses single-column table with subtle background colors to distinguish different commenters
  - Reduced padding (p-1.5) and avatar size (w-6 h-6) for space efficiency
  - Compact text input with inline send button (circular arrow icon positioned inside textarea)
- **Task Section Redesign**: Implemented collapsible accordion groups for better task management
  - Tasks organized by status: In Progress (blue), Pending (amber), Completed (green)
  - Each group shows count badge and collapses/expands independently
  - Scrollable containers (max-height: 300px) within each status group
  - Subtasks display with indented left border and status indicators
  - Default expanded: In Progress and Pending groups; Completed collapsed
- **Task Creation Auto-fill**: Streamlined task creation from request detail
  - Auto-fills title with "Request Type - Requester Name" format
  - Auto-fills due date from parent request
  - Removed PERT time estimation section for compact form
  - Form now only includes: Title, Description, Due Date
- **Rejection Reason Display**: Added prominent alert box for rejected requests
  - Red/pink background with AlertTriangle icon
  - Displays after DialogHeader in request detail view
  - Includes test IDs for automated testing (rejection-reason-alert, text-rejection-reason)

### Email System Bug Fix
- **Fixed analyst re-invitation bug**: Previously, re-adding an analyst (after removal) did not generate a new password or send credentials via EmailJS
- **Root cause**: Condition `!existingUser` prevented password generation for existing users being re-added
- **Solution**: Removed `!existingUser` check for analysts - now generates fresh password for both new and re-added analysts
- **Email flow now correct**:
  - New analysts: Generate password → Send via EmailJS ✓
  - Re-added analysts: Generate NEW password → Send via EmailJS ✓
  - New team_lead/requester: Send invitation via Brevo ✓
  - Re-added team_lead/requester: Send invitation via Brevo ✓
- Updated frontend to show email confirmation for all roles (not just analysts)

### Form Consistency Improvements
- Standardized all task creation forms across different flows (Tasks page, Request Detail, Request Workspace)
- Removed unused assignee state management from task creation dialogs
- Added consistent help text: "Task will be automatically assigned to you. Data Lead can reassign it later if needed."
- All dialogs now follow consistent pattern: DialogHeader → py-4 content → DialogFooter with Cancel/Action buttons

### Task Assignment Rules
- **Auto-assign to creator**: All tasks (main and subtasks) automatically assign to their creator upon creation
- **Main task reassignment**: Only Data Lead can change the assignee of main tasks (tasks where `parentTaskId` is null)
- **Subtask reassignment**: Both Data Lead and Analyst can reassign subtasks (tasks where `parentTaskId` is not null)
- Updated backend authorization in `/api/tasks/:id/assign` and `/api/tasks/:id` endpoints
- Updated frontend forms: main task form removes assignee field (auto-assigns), subtask form shows assignee dropdown for both roles with "Assign to yourself" as default

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

### Email & Notification System

**Email Services:**
- **EmailJS** (Client-side): Used for sending analyst credentials
  - Configured via environment variables: `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`
  - Sends password and login details to newly invited or re-added analysts
  - Template: Custom analyst credentials template with password, email, and inviter name
  
- **Brevo** (Server-side): Used for all other transactional emails
  - Configured via: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`
  - Email types sent:
    - Team member invitations (Data Lead, Requester)
    - Request assignments to analysts
    - Request acceptance/rejection notifications
    - Request delivery notifications
  - Rich HTML email templates with gradient styling

**Email Flows:**
1. **Analyst Invitation**:
   - Backend generates random 12-character password
   - Password hashed with scrypt and stored in database
   - Plain password returned to frontend
   - Frontend sends credentials via EmailJS template
   - Works for both new and re-added analysts

2. **Team Lead/Requester Invitation**:
   - Backend sends invitation email via Brevo
   - Includes role, department, and inviter information
   - User sets password on first login

3. **Request Notifications**:
   - Assignment emails sent when analyst assigned to request
   - Acceptance/rejection emails sent to requester
   - Delivery confirmation emails sent to requester

**In-App Notifications:**
- Real-time WebSocket notifications for live updates
- Persistent notifications stored in `notifications` table
- Notification types: request assignments, status changes, comments
- Unread count badge in header
- Mark as read functionality (individual or bulk)

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