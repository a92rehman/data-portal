# Taleemabad Data Request Management System

## Overview

This is a full-stack data request management system built for Taleemabad team members. The application allows team leads to submit data requests and data analysts to review, manage, and complete those requests. It features a modern, responsive UI built with React and shadcn/ui components, backed by an Express server with PostgreSQL database storage.

The system includes authentication via Replit Auth, request tracking with status management, commenting functionality, and analytics dashboards for monitoring request patterns and performance metrics.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Component Architecture**: The application uses a component-based architecture with reusable UI components from shadcn/ui. Custom components are built for domain-specific features (Header, Sidebar, RequestForm, RequestDetail).
- **State Management Pattern**: Server state is managed through React Query with aggressive caching (staleTime: Infinity) to minimize unnecessary API calls. The application invalidates queries manually when mutations occur.
- **Authentication Flow**: Unauthorized users are redirected to a landing page with Replit Auth login. After authentication, users access the dashboard and analytics pages.
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
- **comments**: Allows threaded discussions on requests with user associations
- **sessions**: PostgreSQL-backed session storage for authentication

**Key Relationships:**
- Users can create multiple data requests (one-to-many)
- Users can be assigned to multiple data requests (one-to-many)
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

**Authorization Model:**
- Role-based access control (team leads vs data analysts)
- Team leads can create and view requests
- Data analysts can assign themselves, update status, and add completion estimates
- All authenticated users can view analytics

### API Structure

**RESTful Endpoints:**
- `GET /api/auth/user` - Get current user profile
- `POST /api/requests` - Create new data request
- `GET /api/requests` - List requests with optional filters (status, department, priority, type, requester, assignee)
- `GET /api/requests/:id` - Get single request with details
- `PUT /api/requests/:id/status` - Update request status
- `PUT /api/requests/:id/assign` - Assign request to analyst
- `POST /api/requests/:id/comments` - Add comment to request
- `GET /api/requests/:id/comments` - Get request comments
- `GET /api/analytics/*` - Various analytics endpoints for dashboards

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

**Build & Deployment:**
- **esbuild**: Bundles server code for production
- **TypeScript**: Type checking with `tsc` via npm check script
- **Environment Variables**: `DATABASE_URL`, `SESSION_SECRET`, `REPL_ID`, `ISSUER_URL`, `REPLIT_DOMAINS` required for operation