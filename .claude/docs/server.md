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
| `server/insightflow.ts` | InsightFlow proxy service — cached health check, iterative SSE, RS256 JWT |

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
