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
