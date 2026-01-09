# Deployment Setup for Docketwise OAuth

## Environment Variables

### Development (.env)

```env
BETTER_AUTH_URL=http://localhost:3000
```

### Production (Deployment Platform)

```env
BETTER_AUTH_URL=https://yourdomain.com
```

## Docketwise OAuth Application Setup

You need to add **both** redirect URIs to your Docketwise OAuth application:

1. **Development**: `http://localhost:3000/api/auth/callback/docketwise`
2. **Production**: `https://yourdomain.com/api/auth/callback/docketwise`

### Steps to Add Multiple Redirect URIs in Docketwise

1. Log into your Docketwise account
2. Go to Settings → API/OAuth Applications
3. Find your OAuth application
4. Add both redirect URIs:
   - `http://localhost:3000/api/auth/oauth2/callback/docketwise`
   - `https://yourdomain.com/api/auth/oauth2/callback/docketwise`
5. Save changes

**Note:** If Docketwise only allows one redirect URI, you'll need to:

- Use localhost URI during development
- Switch to production URI when deploying
- Or create separate OAuth applications for dev and production

## How It Works

The redirect URI is automatically generated from `BETTER_AUTH_URL`:

```typescript
redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/oauth2/callback/docketwise`
```

- **Local dev**: `BETTER_AUTH_URL=http://localhost:3000` → `http://localhost:3000/api/auth/oauth2/callback/docketwise`
- **Production**: `BETTER_AUTH_URL=https://yourdomain.com` → `https://yourdomain.com/api/auth/oauth2/callback/docketwise`

## Deployment Checklist

- [ ] Set `BETTER_AUTH_URL` to your production domain
- [ ] Add production redirect URI to Docketwise OAuth app
- [ ] Verify `DOCKETWISE_CLIENT_ID` and `DOCKETWISE_CLIENT_SECRET` are set
- [ ] Test OAuth flow in production

## Alternative: Separate OAuth Apps

If Docketwise doesn't support multiple redirect URIs, create two OAuth applications:

### Development OAuth App

- Client ID: `dev_client_id`
- Redirect URI: `http://localhost:3000/api/auth/callback/docketwise`

### Production OAuth App

- Client ID: `prod_client_id`
- Redirect URI: `https://yourdomain.com/api/auth/callback/docketwise`

Then use different credentials per environment.
