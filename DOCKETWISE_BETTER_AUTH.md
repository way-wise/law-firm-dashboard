# Docketwise Integration with Better-Auth

## Overview

Docketwise is now integrated as an OAuth provider through better-auth, eliminating the need for manual authentication flows. Users simply click "Sign in with Docketwise" on the login page.

## How It Works

### The Better-Auth Approach

Instead of creating a separate authentication system, we use **better-auth's Generic OAuth plugin** to treat Docketwise like any other OAuth provider (Google, GitHub, etc.).

**Key Benefits:**

- ✅ No manual OAuth flow - better-auth handles everything
- ✅ Tokens stored in existing `accounts` table
- ✅ Automatic token refresh
- ✅ Works seamlessly with your existing auth system
- ✅ One-time setup per user

### Architecture

```
User clicks "Sign in with Docketwise"
    ↓
Better-auth redirects to Docketwise OAuth
    ↓
User authorizes on Docketwise
    ↓
Docketwise redirects back with code
    ↓
Better-auth exchanges code for tokens
    ↓
Tokens saved in accounts table
    ↓
User can now access Docketwise data
```

## Implementation Details

### 1. Configuration (`lib/auth.ts`)

```typescript
import { genericOAuth } from "better-auth/plugins";

export const auth = betterAuth({
  // ... other config
  plugins: [
    nextCookies(),
    genericOAuth({
      config: [
        {
          providerId: "docketwise",
          clientId: process.env.DOCKETWISE_CLIENT_ID!,
          clientSecret: process.env.DOCKETWISE_CLIENT_SECRET!,
          authorizationUrl: process.env.DOCKETWISE_OAUTH_AUTHORIZE_URL!,
          tokenUrl: process.env.DOCKETWISE_OAUTH_TOKEN_URL!,
          redirectURI: process.env.DOCKETWISE_REDIRECT_URI!,
          scopes: ["public", "write"],
          pkce: false,
        },
      ],
    }),
  ],
});
```

### 2. Client Plugin (`lib/auth-client.ts`)

```typescript
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
});
```

### 3. Docketwise API Client (`lib/docketwise.ts`)

The new implementation:

- Gets tokens from `accounts` table (where better-auth stores them)
- Automatically refreshes expired tokens
- Works with the current authenticated user
- No manual token management needed

```typescript
export async function docketwiseRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Gets current user's session
  // Retrieves their Docketwise token from accounts table
  // Automatically refreshes if expired
  // Makes API request
}
```

### 4. Sign-In Page

Added "Sign in with Docketwise" button:

```typescript
<Button
  variant="outline"
  className="w-full"
  onClick={async () => {
    await authClient.signIn.social({
      provider: "docketwise",
      callbackURL: "/dashboard",
    });
  }}
>
  Sign in with Docketwise
</Button>
```

## Database Schema

**No custom tables needed!** Better-auth uses the existing `accounts` table:

```prisma
model accounts {
  id                    String    @id @default(ulid())
  accountId             String
  providerId            String    // "docketwise"
  userId                String
  accessToken           String?   // Docketwise access token
  refreshToken          String?   // Docketwise refresh token
  accessTokenExpiresAt  DateTime? // Token expiry
  // ... other fields
}
```

## Environment Variables

```env
DOCKETWISE_API_URL=https://app.docketwise.com/api/v1
DOCKETWISE_OAUTH_AUTHORIZE_URL=https://app.docketwise.com/oauth/authorize
DOCKETWISE_OAUTH_TOKEN_URL=https://app.docketwise.com/oauth/token
DOCKETWISE_CLIENT_ID=your_client_id
DOCKETWISE_CLIENT_SECRET=your_client_secret
DOCKETWISE_REDIRECT_URI=http://localhost:3000/api/auth/callback/docketwise
```

**Note:** The redirect URI is handled by better-auth automatically at `/api/auth/callback/{providerId}`

## Usage Flow

### For Users

1. Go to sign-in page
2. Click "Sign in with Docketwise"
3. Authorize on Docketwise
4. Redirected back to dashboard
5. All Docketwise data now accessible

### For Developers

```typescript
// In any server component or API route
import { docketwiseRequest } from "@/lib/docketwise";

// Make API calls - tokens handled automatically
const matters = await docketwiseRequest("/matters");
const clients = await docketwiseRequest("/contacts");
```

## Key Differences from Previous Approach

| Previous (Manual OAuth)          | Current (Better-Auth)          |
| -------------------------------- | ------------------------------ |
| Custom token storage table       | Uses existing accounts table   |
| Manual OAuth flow implementation | Better-auth handles everything |
| Separate auth pages              | Integrated in sign-in page     |
| Manual token refresh logic       | Automatic refresh              |
| Complex token management         | Simple API calls               |

## Token Management

**Automatic Refresh:**

- Better-auth tracks token expiry
- Automatically refreshes before making API calls
- No manual intervention needed
- Works transparently in the background

**Per-User Tokens:**

- Each user has their own Docketwise connection
- Tokens are tied to user accounts
- Multiple users can connect different Docketwise accounts

## Error Handling

If a user hasn't connected Docketwise:

```
Error: No valid Docketwise access token. Please connect your Docketwise account.
```

The matters page shows a friendly message directing them to sign in with Docketwise.

## Testing

1. **First Time Setup:**
   - Click "Sign in with Docketwise" on login page
   - Authorize on Docketwise
   - You're redirected back and logged in

2. **Accessing Matters:**
   - Navigate to `/dashboard/matters`
   - Data loads from Docketwise API
   - No additional authentication needed

3. **Token Refresh:**
   - Happens automatically after 180 days
   - No user action required

## Advantages

1. **Simpler Architecture:** No custom auth flow, uses standard OAuth
2. **Better UX:** One-click sign-in, no separate connection step
3. **Maintainable:** Leverages better-auth's battle-tested OAuth implementation
4. **Scalable:** Easy to add more OAuth providers in the future
5. **Secure:** Tokens stored securely in database, automatic refresh

## Future Enhancements

- Add "Connect Docketwise" button in settings for existing users
- Show Docketwise connection status in user profile
- Allow disconnecting/reconnecting Docketwise account
- Support multiple Docketwise accounts per user (if needed)

## Troubleshooting

**Issue:** "No valid Docketwise access token"
**Solution:** User needs to sign in with Docketwise. Direct them to `/auth/sign-in` and click "Sign in with Docketwise"

**Issue:** Token expired
**Solution:** Automatic refresh should handle this. If it fails, user may need to re-authenticate.

**Issue:** Redirect URI mismatch
**Solution:** Ensure `DOCKETWISE_REDIRECT_URI` matches what's registered with Docketwise. For better-auth, it should be `{YOUR_URL}/api/auth/callback/docketwise`

## Summary

This implementation treats Docketwise like any other OAuth provider (Google, GitHub, etc.). Users sign in once, and all API calls work automatically in the background. No manual token management, no separate auth flows, just simple OAuth through better-auth.
