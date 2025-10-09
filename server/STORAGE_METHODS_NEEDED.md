

# Storage Methods Required for Team Member Invitation Feature

The following methods need to be added to `server/storage.ts`:

## 1. getUserByEmail
```typescript
async getUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  return result[0] || null;
}
```

## 2. createInvitedUser
```typescript
async createInvitedUser(
  email: string, 
  role: string, 
  department?: string
): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      email,
      role: role as "requester" | "team_lead" | "analyst",
      department: department || null,
      // firstName and lastName will be populated on first login
    })
    .returning();
  
  return user;
}
```

These methods enable:
- Checking if a user already exists by email before creating an invitation
- Creating a pre-authorized user record that will be populated with full details on first login
- Data Analysts can now be invited by Data Leads and sign in directly without self-selection
