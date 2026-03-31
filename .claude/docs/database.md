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
