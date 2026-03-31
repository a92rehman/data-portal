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
