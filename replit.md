# Taleemabad Data Request Management System

## Overview

This is a full-stack data request management system built for Taleemabad team members. The application allows team leads to submit data requests and data analysts to review, manage, and complete those requests. It features a modern, responsive UI built with React and shadcn/ui components, backed by an Express server with PostgreSQL database storage.

The system includes authentication via Replit Auth, request tracking with status management, commenting functionality, and analytics dashboards for monitoring request patterns and performance metrics.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **Authentication Logging System (October 8, 2025)**: Implemented comprehensive user authentication tracking
  - Added auth_logs table to track all signin, signup, and signout events
  - Captures IP address and user agent for security auditing (with proper data governance)
  - Non-blocking logging: authentication flow continues even if logging fails (wrapped in try-catch)
  - Fixed concurrency bug by using passReqToCallback: true for proper request scoping
  - API endpoint GET /api/auth-logs (team_lead only) to view recent authentication activity
  - **Data Retention Policy**: Auth logs contain personal data (IP addresses, user agents). Access restricted to Data Lead only. Logs should be reviewed periodically and retention policies implemented based on organizational requirements.

- **Three-Role Access Control System (October 8, 2025)**: Implemented proper role-based access control for three distinct user roles
  - **Requester**: Can only see their own submitted requests in "My Requests" view (filtered by requestedById)
  - **Data Lead**: Can see all requests across the organization, review pending requests, accept/reject requests, assign to analysts, and set priorities/deadlines
  - **Analyst**: Can only see requests assigned to them (filtered by assignedToId), add blockers, suggest deadlines, and update request status
  - All new requests automatically land in "pending_review" status (database default)
  - Backend enforcement: GET /api/requests filters by role (requesters see own, analysts see assigned, leads see all)
  - Role checks on routes: accept/reject/assign/priority-deadline restricted to team_lead only; blockers/suggest-deadline restricted to analyst only
  - Created role-specific pages: Pending Reviews, All Requests (team_lead), My Assignments (analyst), Team Management (team_lead)

- **Analytics Access Control (October 3, 2025)**: Restricted Analytics view to data analysts only
  - Analytics navigation link removed from sidebar for team leads
  - Only data analysts can see and access the Analytics page
  - Route protection: team leads redirected to dashboard if they attempt to access /analytics directly
  - Access denied toast message displayed to unauthorized users

- **PDF-Based Form Structure (October 3, 2025)**: Complete overhaul of data request form to match official PDF requirements
  - Replaced all hardcoded values with PDF-specified options for request types, priorities, and departments
  - Updated request types: New Dashboard/Report, Modify Dashboard/Report, Ad-hoc Analysis, Data Extraction, Data Bug, Other
  - Updated priority levels: P0-Critical, P1-High, P2-Medium, P3-Low (from old low/medium/high)
  - Updated departments: Program, P&C, Product, LP, Training, ERP, Finance, Leadership, Strategy, Other
  - Added new required fields: Primary Question, Business Problem, Decision/Action, Impact, Frequency
  - Implemented conditional form sections: Dashboard-specific fields and Section 4 (Actions) only appear for dashboard request types
  - Performed database migration: migrated all existing requests to new enum values, dropped legacy description column
  - Updated all UI components (dashboard filters, request detail, analytics) to display new labels via formatters utility

- **Role-Based Authentication Flow (October 2, 2025)**: Implemented complete role selection and onboarding flow
  - Landing page now shows two role options: "Data Analyst" and "Other Teams" before authentication
  - Role selection stored in localStorage and applied after Replit Auth login
  - Profile setup page for team leads to select their department
  - Team leads redirected to profile setup if department not set, then to dashboard
  - API routes: PATCH /api/auth/user/role (update user role), PATCH /api/auth/user/department (update department)
  - Fixed request form cache invalidation to refresh dashboard after creating new requests

- **File Attachment Feature (October 2, 2025)**: Implemented complete file attachment functionality using Replit Object Storage
  - Users can upload files (max 5 files, 10MB each) to data requests via Uppy file uploader
  - Files stored securely in object storage with metadata tracked in attachments database table
  - Download functionality for uploaded files with file name, size, and uploader information displayed
  - ObjectUploader component wraps Uppy Dashboard with AWS S3 plugin for pre-signed URL uploads
  - API routes: POST /api/objects/upload (generate upload URL), POST /api/requests/:id/attachments (save metadata)
  - Attachments section integrated into RequestDetail component

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Forms**: React Hook Form with Zod validation

**Design Decisions:**
- **Component Architecture**: The application uses a component-based architecture with reusable UI components from shadcn/ui. Custom components are built for domain-specific features (Header, Sidebar, RequestForm, RequestDetail, ProfileSetup).
- **State Management Pattern**: Server state is managed through React Query with aggressive caching (staleTime: Infinity) to minimize unnecessary API calls. The application invalidates queries manually when mutations occur (e.g., after creating requests, updating status).
- **Authentication Flow**: Landing page shows role selection ("Data Analyst" vs "Other Teams"). After Replit Auth login, role is applied to user profile. Team leads without a department are redirected to profile setup page to select their department, then proceed to dashboard.
- **Form Validation**: Zod schemas are shared between client and server for consistent validation. Form errors are displayed inline using React Hook Form integration.

### Backend Architecture

**Technology Stack:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM with Neon serverless PostgreSQL
- **Authentication**: Replit Auth with OpenID Connect (OIDC)
- **Session Management**: express-session with connect-pg-simple for PostgreSQL-backed sessions

**Design Decisions:**
- **Modular Route Structure**: API routes are defined in a central `routes.ts` file with authentication middleware applied to protected endpoints.
- **Storage Abstraction**: A storage interface (`IStorage`) abstracts database operations, allowing for easier testing and potential database swapping.
- **Session Persistence**: Sessions are stored in PostgreSQL rather than in-memory to support horizontal scaling and session persistence across restarts.
- **Development vs Production**: Vite dev server is used in development with HMR support, while production serves static files from the build output.

### Database Schema

**Core Tables:**
- **users**: Stores user profiles with email, name, profile image, role (team_lead/data_analyst), and department
- **dataRequests**: Tracks data requests with title, description, type, priority, status, requester, assignee, and timestamps
- **attachments**: Stores file attachment metadata with fileName, filePath, fileSize, mimeType, requestId (foreign key), uploadedById (foreign key), uploadedAt timestamp
- **comments**: Allows threaded discussions on requests with user associations
- **blockers**: Tracks blockers/issues on requests reported by analysts
- **auth_logs**: Tracks authentication events (signin, signup, signout) with IP address and user agent for security auditing
- **sessions**: PostgreSQL-backed session storage for authentication

**Key Relationships:**
- Users can create multiple data requests (one-to-many)
- Users can be assigned to multiple data requests (one-to-many)
- Data requests can have multiple attachments (one-to-many)
- Attachments belong to both a user (uploader) and a data request (many-to-one)
- Data requests can have multiple comments (one-to-many)
- Comments belong to both a user and a data request (many-to-one)

**Enums:**
- Request status: submitted, under_review, in_progress, completed
- Request priority: low, medium, high, urgent
- Request type: (defined in schema but values not visible in provided files)
- User roles: team_lead, data_analyst

### Authentication & Authorization

**Replit Auth Integration:**
- Uses OpenID Connect (OIDC) discovery for authentication
- Passport.js strategy handles OAuth flow
- User information is stored in PostgreSQL after first login
- Sessions are cookie-based with httpOnly and secure flags
- Role selection happens on landing page before authentication

**Onboarding Flow:**
1. User selects role on landing page: "Data Analyst" or "Other Teams"
2. User authenticates via Replit Auth
3. Role is applied to user profile after login (stored in localStorage during selection)
4. Team leads without department are redirected to profile setup page
5. Team lead selects department (Engineering, Product, Marketing, Operations, Finance)
6. User is redirected to dashboard

**Authorization Model:**
- Role-based access control (requesters, Data Lead, analysts)
- **Requesters**: Can create requests and view only their own requests (filtered by requestedById)
- **Data Lead**: Can see all requests across all departments, accept/reject pending requests, assign requests to analysts, update priority/deadline
- **Analysts**: Can only see requests assigned to them (filtered by assignedToId), add blockers, suggest deadlines, update status
- Analytics view is restricted to Data Lead only

**Data Analyst Accounts:**
- abdul.rehman@niete.edu.pk (Abdul Rehman)
- abdur.rehman@taleemabad.com (Abdur Rehman)
- muhammad.haris@taleemabad.com (Muhammad Haris)
- sameer.sheikh@taleemabad.com (Sameer Sheikh)

### API Structure

**RESTful Endpoints:**
- `GET /api/auth/user` - Get current user profile
- `PATCH /api/auth/user/role` - Update user role (data_analyst or team_lead)
- `PATCH /api/auth/user/department` - Update user department
- `GET /api/users/analysts` - Get list of data analysts (for assignment dropdown)
- `POST /api/requests` - Create new data request
- `GET /api/requests` - List requests with optional filters (status, department, priority, type, requester, assignee); automatically filtered by requestedById for team leads
- `GET /api/requests/:id` - Get single request with details
- `PATCH /api/requests/:id/status` - Update request status (data analysts only)
- `PATCH /api/requests/:id/assign` - Assign request to analyst (data analysts only)
- `PATCH /api/requests/:id/priority-deadline` - Update request priority and deadline (data analysts only)
- `POST /api/requests/:id/attachments` - Add file attachment metadata to request
- `POST /api/requests/:id/comments` - Add comment to request
- `GET /api/requests/:id/comments` - Get request comments
- `POST /api/objects/upload` - Generate pre-signed URL for object storage upload
- `GET /api/analytics/*` - Various analytics endpoints for dashboards
- `GET /api/auth-logs` - View recent authentication events (team_lead only)

**API Design Patterns:**
- Authentication middleware (`isAuthenticated`) protects all API routes
- Input validation using Zod schemas
- Consistent error handling with appropriate HTTP status codes
- JSON response format throughout

### External Dependencies

**Database:**
- **Neon Serverless PostgreSQL**: Serverless PostgreSQL with WebSocket support for edge deployments
- **Connection Pooling**: Uses @neondatabase/serverless with connection pooling via `pg.Pool`
- **Migration Strategy**: Drizzle Kit manages schema migrations with `drizzle-kit push`

**Authentication Service:**
- **Replit Auth**: OIDC-based authentication service
- **Discovery URL**: Configurable via `ISSUER_URL` environment variable (defaults to https://replit.com/oidc)
- **Client Credentials**: Uses `REPL_ID` as client identifier

**UI Component Library:**
- **shadcn/ui**: Accessible component library built on Radix UI primitives
- **Radix UI**: Provides unstyled, accessible components for complex UI patterns
- **Tailwind CSS**: Utility-first CSS framework for styling

**Development Tools:**
- **Vite**: Build tool and dev server with HMR
- **Replit Plugins**: Development-only plugins for enhanced Replit IDE integration (@replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner, @replit/vite-plugin-runtime-error-modal)

**Object Storage:**
- **Replit Object Storage**: Cloud storage for file attachments
- **Google Cloud Storage**: Backend provider for object storage
- **Configuration**: Uses `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR` environment variables
- **File Upload**: Uppy file uploader with AWS S3 plugin using pre-signed URLs
- **Max Limits**: 5 files per upload session, 10MB per file

**Build & Deployment:**
- **esbuild**: Bundles server code for production
- **TypeScript**: Type checking with `tsc` via npm check script
- **Environment Variables**: `DATABASE_URL`, `SESSION_SECRET`, `REPL_ID`, `ISSUER_URL`, `REPLIT_DOMAINS`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR` required for operation