# Progressive Disclosure Project Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure this project so Claude Code loads only what it needs, when it needs it — short root CLAUDE.md with "read when" pointers to focused reference docs.

**Architecture:** Root `CLAUDE.md` (~60 lines) acts as the entry point with topic-scoped `@import` pointers. Detailed docs live in `.claude/docs/`. Debugging artifacts (screenshots, one-off fix files) are deleted. Useful reference docs move to `docs/`.

**Tech Stack:** Markdown, Claude Code `@path` import syntax, existing TypeScript/React/Express/Drizzle stack.

---

## File Map

**Create:**
- `CLAUDE.md` — root entry point, short, with "read when" triggers
- `.claude/docs/stack.md` — dev commands, env vars, build, dependencies
- `.claude/docs/database.md` — schema overview, migrations, Drizzle patterns
- `.claude/docs/server.md` — server structure, routes, services, auth
- `.claude/docs/client.md` — frontend structure, pages, components, hooks
- `.claude/docs/roles.md` — user roles, permissions, onboarding flows
- `docs/architecture.md` — moved/renamed from `replit.md`
- `docs/design-guidelines.md` — moved from `design_guidelines.md`
- `docs/powerbi/` — folder for all 7 PowerBI docs

**Delete (debugging artifacts):**
- Root `.png` files (10 screenshots)
- `COMPLETE_SOLUTION.md`, `FINAL_ANSWER.md`, `FINAL_STATUS.md`, `FIXES_SUMMARY.md`
- `improve-workload-calculation.plan.md`
- `fix_workload.sh`, `update_pert.js`, `fix-production-status.sql`
- `server/fix-delivered-status.ts`
- `server/STORAGE_METHODS_NEEDED.md`

**Move:**
- `replit.md` → `docs/architecture.md`
- `design_guidelines.md` → `docs/design-guidelines.md`
- `POWERBI_*.md`, `POWER_BI_*.md` → `docs/powerbi/`

---

## Task 1: Delete debugging artifacts

**Files:**
- Delete: root `.png` files, throwaway `.md` files, fix scripts

- [ ] **Step 1: Delete root screenshots**

```bash
cd /home/runner/workspace
rm dashboard_after_wait.png dashboard_post_cancel.png department-marketing-hover.png
rm landing_after_load.png modal_buttons.png new-request-dialog-full.png
rm new-request-form-bottom.png page-with-dialog.png priority-dropdown-open.png
rm priority-low-hover.png priority-medium-hover.png
```

- [ ] **Step 2: Delete past-session artifact docs**

```bash
rm COMPLETE_SOLUTION.md FINAL_ANSWER.md FINAL_STATUS.md FIXES_SUMMARY.md
rm improve-workload-calculation.plan.md
```

- [ ] **Step 3: Delete throwaway fix scripts**

```bash
rm fix_workload.sh update_pert.js fix-production-status.sql
rm server/fix-delivered-status.ts
rm server/STORAGE_METHODS_NEEDED.md
```

- [ ] **Step 4: Verify root is clean**

```bash
ls /home/runner/workspace/*.png 2>/dev/null && echo "STILL HAS PNGs" || echo "PNGs clean"
ls /home/runner/workspace/FINAL* 2>/dev/null && echo "STILL HAS FINALS" || echo "Finals clean"
```
Expected: both lines say "clean"

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete debugging artifacts and one-off fix scripts"
```

---

## Task 2: Move reference docs into organized folders

**Files:**
- Create: `docs/` folder structure
- Move: `replit.md`, `design_guidelines.md`, all PowerBI docs

- [ ] **Step 1: Create docs folder structure**

```bash
mkdir -p /home/runner/workspace/docs/powerbi
```

- [ ] **Step 2: Move architecture and design docs**

```bash
cp replit.md docs/architecture.md
cp design_guidelines.md docs/design-guidelines.md
```

- [ ] **Step 3: Move PowerBI docs**

```bash
cp POWERBI_403_TROUBLESHOOTING.md docs/powerbi/403-troubleshooting.md
cp POWER_BI_IMPLEMENTATION_SUMMARY.md docs/powerbi/implementation-summary.md
cp POWERBI_PPU_LIMITATION.md docs/powerbi/ppu-limitation.md
cp POWERBI_PREMIUM_TRIAL_GUIDE.md docs/powerbi/premium-trial-guide.md
cp POWERBI_SDK_SETUP.md docs/powerbi/sdk-setup.md
cp POWER_BI_SERVICE_PRINCIPAL_SETUP.md docs/powerbi/service-principal-setup.md
cp POWER_BI_SETUP_INSTRUCTIONS.md docs/powerbi/setup-instructions.md
```

- [ ] **Step 4: Delete originals from root**

```bash
rm replit.md design_guidelines.md
rm POWERBI_403_TROUBLESHOOTING.md POWER_BI_IMPLEMENTATION_SUMMARY.md
rm POWERBI_PPU_LIMITATION.md POWERBI_PREMIUM_TRIAL_GUIDE.md
rm POWERBI_SDK_SETUP.md POWER_BI_SERVICE_PRINCIPAL_SETUP.md
rm POWER_BI_SETUP_INSTRUCTIONS.md
```

- [ ] **Step 5: Verify**

```bash
ls /home/runner/workspace/docs/powerbi/
```
Expected: 7 files listed

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: organize docs into docs/ and docs/powerbi/ folders"
```

---

## Task 3: Write .claude/docs/stack.md

**Files:**
- Create: `.claude/docs/stack.md`

- [ ] **Step 1: Create the .claude/docs directory**

```bash
mkdir -p /home/runner/workspace/.claude/docs
```

- [ ] **Step 2: Write stack.md**

Create `/home/runner/workspace/.claude/docs/stack.md` with this content:

```markdown
# Stack & Dev Commands

## Dev Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (Express + Vite HMR on port 5000) |
| `npm run build` | Production build |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push Drizzle schema changes to DB |
| `npm run migrate:features` | Run feature migration |
| `npm run seed:metrics` | Seed metric definitions |

## Key Dependencies

- **Frontend**: React 18, Wouter (routing), TanStack Query, shadcn/ui, Radix UI, Tailwind CSS, React Hook Form + Zod
- **Backend**: Express.js, Passport.js (local strategy), express-session, connect-pg-simple
- **Database**: Drizzle ORM, Neon serverless PostgreSQL (`@neondatabase/serverless`)
- **Services**: OpenAI (insights), Power BI embed, Brevo/EmailJS (email), Google Cloud Storage

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string (required) |
| `SESSION_SECRET` | Express session secret (required) |
| `OPENAI_API_KEY` | AI insights (optional) |
| `POWERBI_CLIENT_ID` | Power BI app registration |
| `POWERBI_CLIENT_SECRET` | Power BI app secret |
| `POWERBI_TENANT_ID` | Azure tenant |
| `POWERBI_WORKSPACE_ID` | Power BI workspace |
| `BREVO_API_KEY` | Email via Brevo |
| `EMAILJS_*` | EmailJS fallback |
| `GCS_BUCKET_NAME` | Google Cloud Storage bucket |

## Project Layout

```
client/          React frontend (Vite)
  src/
    pages/       Route-level components
    components/  Shared UI components
    hooks/       Custom React hooks
    contexts/    React contexts (WebSocket, Auth)
    lib/         Utilities
server/          Express backend
  index.ts       Entry point
  routes.ts      All API routes (~2000 lines)
  storage.ts     IStorage interface + DB implementation
  auth.ts        Passport.js setup
  db.ts          Drizzle DB connection
  *.ts           Service files (email, AI, PowerBI, etc.)
shared/
  schema.ts      Drizzle schema + Zod types (source of truth)
  constants.ts   Shared enums and constants
migrations/      SQL migration files
```
```

- [ ] **Step 3: Verify file was written**

```bash
wc -l /home/runner/workspace/.claude/docs/stack.md
```
Expected: ~60 lines

- [ ] **Step 4: Commit**

```bash
git add .claude/docs/stack.md
git commit -m "docs: add .claude/docs/stack.md for progressive disclosure"
```

---

## Task 4: Write .claude/docs/database.md

**Files:**
- Create: `.claude/docs/database.md`

- [ ] **Step 1: Write database.md**

Create `/home/runner/workspace/.claude/docs/database.md` with this content:

```markdown
# Database Reference

## ORM & Connection

- Drizzle ORM with Neon serverless PostgreSQL
- Connection: `server/db.ts` exports `db` (drizzle instance) and `pool`
- Schema source of truth: `shared/schema.ts` — all tables, enums, Zod validators

## Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User profiles | `id`, `email`, `role`, `department`, `passwordHash` |
| `dataRequests` | Request lifecycle | `id`, `status`, `priority`, `type`, `requesterId`, `assigneeId`, `workStartedAt` |
| `tasks` | Kanban tasks per request | `id`, `requestId`, `status`, `dueDate`, `pertEstimate` |
| `comments` | Threaded discussion | `id`, `requestId`, `userId`, `content` |
| `attachments` | File metadata | `id`, `requestId`, `fileName`, `storageUrl` |
| `blockers` | Request blockers | `id`, `requestId`, `description`, `resolved` |
| `auth_logs` | Auth events | `id`, `userId`, `event`, `timestamp` |
| `sessions` | Session storage | Managed by connect-pg-simple |
| `metricDefinitions` | Metric detail pages | `id`, `name`, `body` (rich text) |

## Key Enums (in shared/schema.ts)

- **Request status**: `submitted` → `under_review` → `in_progress` → `pending_review` → `completed` (also `delivered`)
- **Priority**: `P0-Critical`, `P1-High`, `P2-Medium`, `P3-Low`
- **Request type**: `New Dashboard/Report`, `Modify Dashboard/Report`, `Ad-hoc Analysis`, `Data Extraction`, `Data Bug`, `BigQuery Access`, `Event Tracking`, `Metric Change`, `Pipeline Change`, `Recurring Report`, `Other`
- **User roles**: `team_lead`, `data_analyst` (requesters are a separate signup flow)

## Migrations

- Schema changes: edit `shared/schema.ts`, then run `npm run db:push`
- Manual SQL migrations in `migrations/` folder
- Drizzle migration meta in `migrations/meta/`

## Drizzle Patterns

```typescript
// Query example
import { db } from "./db";
import { dataRequests } from "@shared/schema";
import { eq } from "drizzle-orm";

const request = await db.query.dataRequests.findFirst({
  where: eq(dataRequests.id, id),
  with: { tasks: true, comments: true }
});

// Insert example
await db.insert(dataRequests).values({ ...data }).returning();

// Update example
await db.update(dataRequests)
  .set({ status: "in_progress" })
  .where(eq(dataRequests.id, id));
```
```

- [ ] **Step 2: Verify**

```bash
wc -l /home/runner/workspace/.claude/docs/database.md
```
Expected: ~65 lines

- [ ] **Step 3: Commit**

```bash
git add .claude/docs/database.md
git commit -m "docs: add .claude/docs/database.md for progressive disclosure"
```

---

## Task 5: Write .claude/docs/server.md

**Files:**
- Create: `.claude/docs/server.md`

- [ ] **Step 1: Write server.md**

Create `/home/runner/workspace/.claude/docs/server.md` with this content:

```markdown
# Server Reference

## Entry Point

`server/index.ts` — starts Express, registers routes, starts HTTP server on port 5000 (serves Vite in dev, static build in prod)

## Key Files

| File | Responsibility |
|------|---------------|
| `server/routes.ts` | All API routes (~2000 lines) — single file, all endpoints |
| `server/storage.ts` | `IStorage` interface + `DatabaseStorage` implementation — all DB queries go here |
| `server/auth.ts` | Passport.js local strategy setup, `hashPassword`, `comparePasswords` |
| `server/db.ts` | Drizzle DB connection export |
| `server/emailService.ts` | All email sending functions (Brevo + EmailJS fallback) |
| `server/openaiService.ts` | AI insight generation |
| `server/openaiChatService.ts` | Dashboard AI chat, context data |
| `server/powerbiService.ts` | Power BI embed tokens, dataset queries, DAX |
| `server/objectStorage.ts` | Google Cloud Storage file upload/download |
| `server/websocket.ts` | WebSocket server, push notifications to clients |
| `server/conversationStore.ts` | In-memory conversation store for AI chat |

## Route Patterns

All routes in `server/routes.ts`. Auth middleware pattern:

```typescript
// Protected route
app.get('/api/resource', isAuthenticated, async (req: any, res) => {
  const user = req.user; // typed as User from schema
  // ...
});

// Role check (inline)
if (req.user.role !== 'data_analyst') {
  return res.status(403).json({ message: "Forbidden" });
}
```

## Authentication

- Passport.js local strategy (email + password)
- Sessions via `express-session` + `connect-pg-simple` (stored in `sessions` table)
- `isAuthenticated` middleware in `routes.ts` — use on all protected routes
- Password hashing: `hashPassword(password)` → `{hash}:{salt}`, `comparePasswords(supplied, stored)`

## Storage Interface Pattern

All DB access goes through `IStorage` in `server/storage.ts`:

```typescript
// Add new operation: define in IStorage interface, implement in DatabaseStorage
interface IStorage {
  getRequest(id: number): Promise<DataRequest | undefined>;
  // ...
}
```

Never query `db` directly from `routes.ts` — always go through `storage`.
```

- [ ] **Step 2: Verify**

```bash
wc -l /home/runner/workspace/.claude/docs/server.md
```
Expected: ~65 lines

- [ ] **Step 3: Commit**

```bash
git add .claude/docs/server.md
git commit -m "docs: add .claude/docs/server.md for progressive disclosure"
```

---

## Task 6: Write .claude/docs/client.md

**Files:**
- Create: `.claude/docs/client.md`

- [ ] **Step 1: Write client.md**

Create `/home/runner/workspace/.claude/docs/client.md` with this content:

```markdown
# Client Reference

## Structure

```
client/src/
  main.tsx          App entry, QueryClientProvider wrapper
  App.tsx           Router — all routes defined here
  pages/            Route-level components (one per page)
  components/       Shared UI components
    ui/             shadcn/ui primitives (don't edit)
  hooks/            Custom React hooks
  contexts/         React contexts
  lib/              Utilities (queryClient, auth utils, etc.)
  config/           App config constants
```

## Key Pages

| Page | Path | Who can access |
|------|------|---------------|
| `dashboard.tsx` | `/dashboard` | All authenticated |
| `my-requests.tsx` | `/my-requests` | Requesters |
| `my-assignments.tsx` | `/my-assignments` | Analysts |
| `request-workspace.tsx` | `/requests/:id` | All authenticated |
| `analytics.tsx` | `/analytics` | Data Leads |
| `team.tsx` | `/team` | Data Leads |
| `tasks.tsx` | `/tasks` | Analysts, Data Leads |
| `metric-definitions.tsx` | `/metrics` | All authenticated |
| `dashboards.tsx` | `/dashboards` | All authenticated |
| `settings.tsx` | `/settings` | All authenticated |

## Data Fetching Pattern

TanStack Query for all server state:

```typescript
// Query
const { data, isLoading } = useQuery({
  queryKey: ["/api/requests"],
  // fetcher is auto-wired via queryClient default
});

// Mutation with invalidation
const mutation = useMutation({
  mutationFn: (data) => apiRequest("POST", "/api/requests", data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/requests"] }),
});
```

## Auth Hook

```typescript
import { useAuth } from "@/hooks/useAuth";
const { user, isAuthenticated, isLoading } = useAuth();
// user.role: "team_lead" | "data_analyst"
// requesters use a separate user object shape
```

## WebSocket

```typescript
import { useWebSocket } from "@/contexts/WebSocketContext";
const { sendMessage, lastMessage } = useWebSocket();
```

## Adding a New Page

1. Create `client/src/pages/my-page.tsx`
2. Add route in `client/src/App.tsx`: `<Route path="/my-page" component={MyPage} />`
3. Add nav link in `client/src/components/sidebar.tsx` or `mobile-nav.tsx`
```

- [ ] **Step 2: Verify**

```bash
wc -l /home/runner/workspace/.claude/docs/client.md
```
Expected: ~70 lines

- [ ] **Step 3: Commit**

```bash
git add .claude/docs/client.md
git commit -m "docs: add .claude/docs/client.md for progressive disclosure"
```

---

## Task 7: Write .claude/docs/roles.md

**Files:**
- Create: `.claude/docs/roles.md`

- [ ] **Step 1: Write roles.md**

Create `/home/runner/workspace/.claude/docs/roles.md` with this content:

```markdown
# User Roles & Permissions

## Roles

| Role | DB value | Description |
|------|----------|-------------|
| Data Lead | `team_lead` | Full system access — manage team, assign analysts, analytics |
| Data Analyst | `data_analyst` | Manage assigned requests, tasks, blockers |
| Requester | (separate signup) | Submit requests, view own requests only |

## Onboarding Flows

### Requesters (self-signup)
1. Visit `/requester-signup`
2. Must use `@taleemabad.com` or `@niete.edu.pk` email (or test emails)
3. Select department, auto-login after signup
4. Page: `client/src/pages/requester-signup.tsx`

### Analysts (invited)
1. Data Lead invites from Team page → email sent with setup link
2. Analyst visits `/setup-password` with token
3. Sets password, then logs in normally
4. Pages: `client/src/pages/setup-password.tsx`

### Data Leads
- Created directly in DB or by existing Data Lead from Team page
- Role: `team_lead` in `users.role`

## Permission Rules (enforced server-side in routes.ts)

- Only `team_lead` can: assign analysts, change priorities, view full analytics, manage team
- Only `data_analyst` can: update task status, mark requests complete
- Requesters can only see their own requests
- `isAuthenticated` middleware gates all `/api/*` routes

## Allowed Email Domains

```typescript
const allowedDomains = ['@taleemabad.com', '@niete.edu.pk'];
// Test emails: ar09info@gmail.com, ar92info@gmail.com
```
(defined in `server/routes.ts` — `isAllowedRequesterEmail()`)
```

- [ ] **Step 2: Verify**

```bash
wc -l /home/runner/workspace/.claude/docs/roles.md
```
Expected: ~55 lines

- [ ] **Step 3: Commit**

```bash
git add .claude/docs/roles.md
git commit -m "docs: add .claude/docs/roles.md for progressive disclosure"
```

---

## Task 8: Write root CLAUDE.md

**Files:**
- Create: `CLAUDE.md` at project root

- [ ] **Step 1: Write CLAUDE.md**

Create `/home/runner/workspace/CLAUDE.md` with this content:

```markdown
# DataHub — Claude Code Entry Point

DataHub is a full-stack data request management system for Taleemabad. Team leads submit data requests; analysts manage, track, and complete them. Built with React + Express + Drizzle + Neon PostgreSQL.

## Quick Reference

- **Start dev server**: `npm run dev` (port 5000)
- **Type check**: `npm run check`
- **Push DB schema**: `npm run db:push`

## Read When...

**Touching dependencies, env vars, build, or project layout:**
@.claude/docs/stack.md

**Working with the database, schema, migrations, or Drizzle queries:**
@.claude/docs/database.md

**Working on API routes, server services, auth, or storage:**
@.claude/docs/server.md

**Working on frontend pages, components, hooks, or routing:**
@.claude/docs/client.md

**Handling user roles, permissions, or onboarding flows:**
@.claude/docs/roles.md

## Key Conventions

- All DB access goes through `IStorage` in `server/storage.ts` — never query `db` directly from routes
- Shared types live in `shared/schema.ts` — single source of truth for DB schema + Zod validators
- All API routes in `server/routes.ts`
- TanStack Query for all client-server data fetching — invalidate on mutation
- shadcn/ui components in `client/src/components/ui/` — don't edit these directly

## Architecture Docs

Full system architecture: `docs/architecture.md`
Design guidelines: `docs/design-guidelines.md`
Power BI setup: `docs/powerbi/`
```

- [ ] **Step 2: Verify line count is short**

```bash
wc -l /home/runner/workspace/CLAUDE.md
```
Expected: ~45 lines

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with progressive disclosure structure"
```

---

## Task 9: Write the project-structure skill

**Files:**
- Create: `.claude/skills/project-structure/SKILL.md`

- [ ] **Step 1: Create skill directory**

```bash
mkdir -p /home/runner/workspace/.claude/skills/project-structure
```

- [ ] **Step 2: Write SKILL.md**

Create `/home/runner/workspace/.claude/skills/project-structure/SKILL.md` with this content:

```markdown
---
name: project-structure
description: Use when asked about where a file belongs, how the project is organized, or when adding new features and needing to know which folder, file, or layer to put things in for this DataHub project.
---

# DataHub Project Structure

## Overview

Full-stack TypeScript app — React frontend, Express backend, Drizzle ORM, Neon PostgreSQL.

## Where Things Live

| What you're doing | Where it goes |
|-------------------|--------------|
| New API endpoint | `server/routes.ts` + `server/storage.ts` (IStorage interface) |
| New DB table/column | `shared/schema.ts` → run `npm run db:push` |
| New frontend page | `client/src/pages/` + route in `App.tsx` + nav in `sidebar.tsx` |
| New shared component | `client/src/components/` |
| New custom hook | `client/src/hooks/` |
| New server service | `server/` (new file, e.g. `server/myService.ts`) |
| New email function | `server/emailService.ts` |
| Reference docs | `docs/` |
| Claude context docs | `.claude/docs/` |

## Progressive Disclosure Docs

Load these only when relevant:

- **Stack, commands, env vars** → `.claude/docs/stack.md`
- **DB schema, migrations, Drizzle** → `.claude/docs/database.md`
- **Server routes, auth, services** → `.claude/docs/server.md`
- **Frontend pages, components, hooks** → `.claude/docs/client.md`
- **Roles, permissions, onboarding** → `.claude/docs/roles.md`

## Rules

- Never query `db` directly in `server/routes.ts` — always via `storage`
- Types from `shared/schema.ts` only — no duplicate type definitions
- `client/src/components/ui/` — shadcn primitives, do not edit
```

- [ ] **Step 3: Verify**

```bash
wc -l /home/runner/workspace/.claude/skills/project-structure/SKILL.md
```
Expected: ~50 lines

- [ ] **Step 4: Final commit**

```bash
git add .claude/skills/project-structure/
git commit -m "feat: add project-structure skill for Claude Code progressive disclosure"
```

---

## Self-Review Checklist

- [x] Delete all root PNGs ✓ Task 1
- [x] Delete throwaway fix scripts ✓ Task 1
- [x] Move docs to `docs/` and `docs/powerbi/` ✓ Task 2
- [x] `.claude/docs/stack.md` with commands, env, layout ✓ Task 3
- [x] `.claude/docs/database.md` with schema, enums, patterns ✓ Task 4
- [x] `.claude/docs/server.md` with routes, auth, storage ✓ Task 5
- [x] `.claude/docs/client.md` with pages, hooks, patterns ✓ Task 6
- [x] `.claude/docs/roles.md` with permissions, onboarding ✓ Task 7
- [x] Root `CLAUDE.md` short with `@import` pointers ✓ Task 8
- [x] `project-structure` skill for placement guidance ✓ Task 9
