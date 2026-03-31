# Power BI Service Principal Setup Guide

## ⚠️ IMPORTANT: Administrative Action Required

Your application is getting a **403 Forbidden** error from Power BI API with message:
> "API is not accessible for application"

**Diagnostic Result:** ✅ Azure authentication is working perfectly. ❌ Power BI API access is **DISABLED** in tenant settings.

This indicates that **Service Principal API access is disabled** in your Power BI tenant settings. This can ONLY be fixed by a Power BI Admin or Global Admin in the Power BI Admin Portal.

## Solution: Enable Service Principal API Access

Follow these steps to enable Service Principal access in Power BI:

### Step 1: Access Power BI Admin Portal

1. Open your browser and go to: **https://app.powerbi.com/admin-portal**
2. Make sure you're logged in as a **Global Administrator** or **Power BI Administrator**

### Step 2: Enable Service Principals to Use Power BI APIs

1. In the Admin Portal, navigate to: **Tenant settings** (left sidebar)
2. Scroll down to find: **Developer settings**
3. Look for: **"Allow service principals to use Power BI APIs"**
4. **Toggle it to ON**
5. **Choose your scope**:
   - Recommended: **"Entire organization"** (for testing)
   - OR: Select a specific security group if you want to limit access
6. Click **"Apply"** to save changes

### Step 3: Enable Embedding (if not already enabled)

1. Still in **Tenant settings** → **Developer settings**
2. Find: **"Embed content in apps"**
3. **Toggle it to ON**
4. Set scope to **"Entire organization"** (or your security group)
5. Click **"Apply"**

### Step 4: Add Service Principal to Power BI Workspace

1. Go to: **https://app.powerbi.com**
2. Navigate to your workspace (where the report is stored)
3. Click **"..."** (three dots) next to the workspace name → **"Manage access"**
4. Click **"+ Add people or groups"**
5. Paste your Service Principal's Client ID: **REDACTED_CLIENT_ID**
6. Select role: **"Member"** or **"Admin"** (NOT "Viewer")
7. Click **"Add"**

### Step 5: Verify Configuration

After making these changes:
1. **Wait 15-30 minutes** for settings to propagate across the tenant
2. Test the application again
3. Check the browser console - you should see successful token generation

## Alternative: Use Auto-Auth for Testing

If you cannot enable Service Principal access immediately, the application will automatically **fall back to Auto-Auth** mode:

- Users will be prompted to sign in to Power BI with their Microsoft account
- They can still view the dashboard after signing in
- This works without any Service Principal configuration

### Current Behavior

Your application already has **automatic fallback**:
1. Attempts to generate embed token with Service Principal
2. If it fails (403 error), automatically uses `autoAuth=true` mode
3. Users sign in manually when they view the dashboard

## Troubleshooting

### Error: "API is not accessible for application"
- **Cause**: Service Principal API access is disabled
- **Fix**: Follow Step 2 above

### Error: "Embedding is disabled"
- **Cause**: Content embedding is disabled
- **Fix**: Follow Step 3 above

### Error: "Access denied to workspace"
- **Cause**: Service Principal not added to workspace
- **Fix**: Follow Step 4 above

### Error: "Service Principal not found"
- **Cause**: Wrong Client ID or Service Principal was deleted
- **Fix**: Verify the Client ID matches your Azure AD App Registration

## Service Principal Details

- **Client ID**: REDACTED_CLIENT_ID
- **Tenant ID**: REDACTED_TENANT_ID
- **Azure AD App Registration**: Check Azure Portal for full details

## Need Help?

If you're not a Global Admin or Power BI Admin:
1. Contact your IT administrator
2. Share this document with them
3. Request them to enable the settings in Step 2 and 3

## Testing

After configuration, test with:
```bash
curl http://localhost:5000/api/powerbi/embed-token/c1b79fbf-b77a-4d42-a8b5-913c0b9280d9
```

You should get a JSON response with a `token` field instead of an error.

