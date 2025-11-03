# Power BI SDK Setup Guide

## Is Power BI SDK Free?

**YES! ✅ The Power BI JavaScript SDK is completely FREE and open source.**

- The SDK itself is free to use
- No licensing fees for the SDK
- Available on GitHub: https://github.com/microsoft/PowerBI-JavaScript
- Published on npm: https://www.npmjs.com/package/powerbi-client

## What About Power BI Service Costs?

While the SDK is free, you do need a **Power BI license** to use the Power BI service:

### Licensing Options:

1. **Power BI Pro** - $14.00/user/month (paid yearly)
   - For publishing and sharing reports internally
   - Required for Service Principal authentication

2. **Power BI Premium Per User** - $24.00/user/month
   - Advanced features and larger datasets

3. **Power BI Embedded (Azure)** - Starting ~$735/month
   - For embedding in external applications
   - Pay-as-you-go capacity model

**Note:** Since you're using **Service Principal** authentication, you need:
- Power BI Pro license (or Premium)
- Service Principal registered in Azure AD
- Proper tenant settings enabled (already configured)

## Current Setup Status

✅ **Already Configured in Your App:**

1. **SDK Script Added** (`client/index.html`):
   ```html
   <script src="https://cdn.jsdelivr.net/npm/powerbi-client@2.21.5/dist/powerbi.min.js"></script>
   ```

2. **Component Integration** (`client/src/components/PowerBIDashboard.tsx`):
   - Checks for SDK availability
   - Uses SDK for token-based embedding
   - Falls back to iframe if SDK unavailable

3. **Server-Side Token Generation** (`server/powerbiService.ts`):
   - Generates embed tokens via Service Principal
   - Fetches proper embed URLs from Power BI API

## How It Works

1. **SDK Loads** from CDN when page loads
2. **Component Checks** for `window.powerbi` availability
3. **Token Generated** server-side using Service Principal
4. **Report Embedded** using SDK's `embed()` method

## Troubleshooting

If you see "Power BI SDK not available" in console:

1. **Check Browser Console** for script loading errors
2. **Verify Script Tag** is in `index.html` (should be before React loads)
3. **Check Network Tab** - ensure `powerbi.min.js` loads successfully
4. **Hard Refresh** - Clear cache (Ctrl+Shift+R / Cmd+Shift+R)

## Alternative: Install via npm (for TypeScript support)

If you want better TypeScript types:

```bash
npm install --save powerbi-client
```

Then import:
```typescript
import * as pbi from 'powerbi-client';
```

But CDN version works fine for most use cases!

## Summary

- ✅ SDK is FREE
- ✅ Already set up in your app
- ⚠️  Need Power BI license for the service (already have this)
- ✅ Service Principal configured (working)

The SDK should load automatically when you refresh the page. If not, check the console for errors.

