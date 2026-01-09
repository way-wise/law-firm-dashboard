# Docketwise API Integration

## Overview

Successfully integrated Docketwise API with OAuth 2.0 authentication following the todos.ts pattern.

## Implementation Summary

### 1. Environment Variables (.env)

```env
DOCKETWISE_API_URL=https://app.docketwise.com/api/v1
DOCKETWISE_OAUTH_AUTHORIZE_URL=https://app.docketwise.com/oauth/authorize
DOCKETWISE_OAUTH_TOKEN_URL=https://app.docketwise.com/oauth/token
DOCKETWISE_CLIENT_ID=your_client_id
DOCKETWISE_CLIENT_SECRET=your_client_secret
DOCKETWISE_REDIRECT_URI=http://localhost:3000/rpc/docketwise/oauth2/callback
```

### 2. Core Files Created/Modified

#### lib/docketwise.ts

Reusable Docketwise authentication and API client utility:

- `getDocketwiseAuthUrl()` - Get OAuth authorization URL
- `exchangeCodeForToken(code)` - Exchange auth code for access token
- `refreshAccessToken()` - Refresh expired tokens
- `getValidAccessToken()` - Get valid token (auto-refresh if needed)
- `docketwiseRequest<T>(endpoint, options)` - Make authenticated API requests
- Token management with automatic refresh (180 day expiry)

#### router/docketwise.ts

OAuth endpoints:

- `GET /docketwise/auth-url` - Get authorization URL
- `GET /docketwise/oauth2/callback` - Handle OAuth callback
- `GET /docketwise/auth-status` - Check authentication status

#### router/matters.ts

Matters CRUD endpoints following todos.ts pattern:

- `GET /matters` - List all matters (with pagination)
- `GET /matters/{id}` - Get single matter
- `POST /matters` - Create matter
- `PUT /matters/{id}` - Update matter
- `DELETE /matters/{id}` - Delete matter
- `GET /matters/{id}/receipts` - Get matter receipts

All endpoints use Zod schemas for type safety.

#### router/index.ts

Updated to export all Docketwise and matters endpoints.

### 3. Page Implementation (Following todos.ts Pattern)

#### app/dashboard/matters/page.tsx

Server component that:

1. Uses `client` from `@/lib/orpc/client` (server-side client)
2. Fetches data with `await client.matters.get()`
3. Passes data as props to client component
4. Supports search params (page, archived, client_id)

```typescript
const matters = await client.matters.get({
  page: page ?? 1,
  archived: archived === "true" ? true : undefined,
  client_id: client_id ? Number(client_id) : undefined,
});

return <MattersTable matters={matters} />;
```

#### app/dashboard/matters/matters-table.tsx

Client component that:

1. Accepts `matters` prop with data and pagination
2. Displays data in table with columns
3. No useEffect - data comes from server

### 4. OAuth Flow

1. **User initiates auth**: Call `/rpc/docketwise/auth-url` to get authorization URL
2. **User authorizes**: Redirect to Docketwise authorization page
3. **Callback**: Docketwise redirects to `/rpc/docketwise/oauth2/callback?code=...`
4. **Token exchange**: Backend exchanges code for access_token and refresh_token
5. **Store tokens**: Tokens stored in memory (TODO: move to database)
6. **API calls**: All subsequent API calls use Bearer token authentication

### 5. Key Features

- **Type-safe**: Full TypeScript with Zod schemas
- **Auto-refresh**: Tokens automatically refresh before expiry
- **Pagination**: Supports Docketwise pagination (200 records per page max)
- **Error handling**: Proper error messages and status codes
- **Server-side rendering**: Data fetched on server, passed to client
- **No useEffect**: Following Next.js App Router best practices

## Usage

### Authenticate with Docketwise

```typescript
// Get auth URL
const { url } = await client.docketwise.getAuthUrl();
// Redirect user to url

// After callback, check status
const { authenticated } = await client.docketwise.checkAuthStatus();
```

### Fetch Matters

```typescript
// In server component
const matters = await client.matters.get({
  page: 1,
  archived: false,
});
```

### Create Matter

```typescript
const matter = await client.matters.create({
  title: "John Doe - H1B",
  client_id: 123,
  user_ids: [1, 2],
});
```

## Important Notes

1. **Token Storage**: Currently tokens are stored in memory. For production, implement database storage.
2. **Redirect URI**: Must match exactly what's registered with Docketwise (including localhost for dev).
3. **Rate Limiting**: Docketwise limits to 120 requests per minute per token.
4. **Pagination**: Max 200 records per page, use X-Pagination header for metadata.
5. **Token Expiry**: Access tokens expire after 180 days.

## Next Steps

1. Implement database storage for tokens (use Prisma)
2. Add user-specific token management (multi-user support)
3. Implement other Docketwise endpoints (contacts, documents, charges, etc.)
4. Add error handling UI for authentication failures
5. Create auth status indicator in dashboard
6. Add token refresh background job

## Testing

To test the integration:

1. Ensure Docketwise credentials are in .env
2. Start dev server: `pnpm dev`
3. Navigate to matters page
4. If not authenticated, will need to implement auth flow UI
5. Once authenticated, matters will load from Docketwise API
