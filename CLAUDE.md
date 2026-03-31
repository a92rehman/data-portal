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
