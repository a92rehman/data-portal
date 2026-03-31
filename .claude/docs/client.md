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
| `ask-data.tsx` | `/ask-data` | All authenticated |
| `my-dashboards.tsx` | `/my-dashboards` | All authenticated |
| `my-reports.tsx` | `/my-reports` | All authenticated |
| `observability.tsx` | `/observability` | Data Leads |

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
