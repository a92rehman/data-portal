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
