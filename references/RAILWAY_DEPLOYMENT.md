# Railway Deployment Guide

## Why Railway Instead of Vercel?

Railway is better suited for this application because:

- ✅ **Persistent Connections** - Supports WebSocket and SSE (Server-Sent Events)
- ✅ **Long-Running Processes** - Not serverless, can run cron jobs natively
- ✅ **PostgreSQL Database** - Built-in database support
- ✅ **Background Jobs** - Can run schedulers without external services

Vercel's serverless architecture has limitations:

- ❌ No WebSocket support
- ❌ 10-second function timeout (Hobby), 60s (Pro)
- ❌ No persistent connections for SSE
- ❌ Requires external services for cron jobs

---

## Deployment Steps

### 1. Create Railway Project

1. Sign up at https://railway.app
2. Create a new project
3. Add PostgreSQL database service
4. Add your Next.js application

### 2. Environment Variables

Add all variables from `.env.example` in Railway dashboard:

```env
# Better Auth
BETTER_AUTH_SECRET=your-random-secret-here
BETTER_AUTH_URL=https://your-app.railway.app

# Database (automatically provided by Railway)
DATABASE_URL=postgresql://...

# Docketwise API
DOCKETWISE_API_URL=https://app.docketwise.com/api/v1
DOCKETWISE_OAUTH_AUTHORIZE_URL=https://app.docketwise.com/oauth/authorize
DOCKETWISE_OAUTH_TOKEN_URL=https://app.docketwise.com/oauth/token
DOCKETWISE_CLIENT_ID=your-client-id
DOCKETWISE_CLIENT_SECRET=your-client-secret

# Email Service (Resend)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=notifications@yourdomain.com

# Cron Job Security
CRON_SECRET=your-random-secret-here

# Application URL
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
```

### 3. Database Setup

Railway automatically provisions PostgreSQL. After deployment:

```bash
# Run migrations
railway run npx prisma migrate deploy

# Or use db push for development
railway run npx prisma db push
```

### 4. Cron Job Setup

Railway doesn't have built-in cron support, so use one of these options:

#### Option A: External Cron Service (Recommended)

Use **Cron-job.org** or **EasyCron**:

1. Create account at https://cron-job.org
2. Add new cron job:
   - URL: `https://your-app.railway.app/api/cron/check-deadlines`
   - Schedule: `0 9 * * *` (9 AM daily)
   - HTTP Method: POST
   - Headers: `Authorization: Bearer your-cron-secret`

#### Option B: Railway Cron Plugin

Use the Railway Cron plugin:

1. Add Cron plugin to your project
2. Configure schedule: `0 9 * * *`
3. Command: `curl -X POST https://your-app.railway.app/api/cron/check-deadlines -H "Authorization: Bearer $CRON_SECRET"`

#### Option C: Node-Cron (In-App)

Add `node-cron` to run scheduler in-app:

```typescript
// lib/cron.ts
import cron from 'node-cron';
import { checkAndSendDeadlineNotifications } from './notifications/scheduler';

export function startCronJobs() {
  // Run daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running deadline check...');
    await checkAndSendDeadlineNotifications();
  });
}
```

Then call `startCronJobs()` in your app startup.

### 5. Build Configuration

Railway automatically detects Next.js. Ensure `package.json` has:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "start": "next start",
    "postinstall": "prisma generate"
  }
}
```

---

## SSE (Server-Sent Events) Support

✅ **Railway fully supports SSE** for real-time notifications!

The notification subscription endpoint uses SSE (not WebSocket):

- Endpoint: `/api/orpc/notifications.subscribe`
- Protocol: HTTP with `text/event-stream`
- Works perfectly on Railway's infrastructure

No additional configuration needed - SSE works out of the box.

---

## Monitoring & Logs

Railway provides:

- Real-time logs in dashboard
- Metrics (CPU, Memory, Network)
- Deployment history
- Automatic HTTPS

Access logs:

```bash
railway logs
```

---

## Cost Estimate

Railway Pricing (as of 2024):

- **Hobby Plan**: $5/month
  - 512 MB RAM
  - 1 GB Disk
  - Shared CPU
  - Good for small teams

- **Pro Plan**: $20/month
  - 8 GB RAM
  - 100 GB Disk
  - Dedicated resources
  - Better for production

PostgreSQL database included in both plans.

---

## Scaling Considerations

For production with multiple servers:

### 1. Replace MemoryPublisher with Redis

Current implementation uses `MemoryPublisher` (single-server only).

For multi-server deployments, switch to Redis:

```typescript
// lib/notifications/publisher.ts
import { Redis } from 'ioredis';
import { IORedisPublisher } from '@orpc/experimental-publisher/ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const notificationPublisher = new IORedisPublisher<NotificationEvents>({
  commander: redis,
  subscriber: redis.duplicate(),
  resumeRetentionSeconds: 60 * 5,
});
```

Add Redis to Railway:

1. Add Redis service in Railway dashboard
2. Set `REDIS_URL` environment variable
3. Install: `pnpm add ioredis @orpc/experimental-publisher`

### 2. Horizontal Scaling

Railway supports horizontal scaling:

- Add replicas in dashboard
- Load balancer automatically configured
- SSE connections distributed across instances

---

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
railway run npx prisma db pull
```

### Build Failures

```bash
# Check logs
railway logs --deployment <deployment-id>

# Rebuild
railway up --detach
```

### SSE Not Working

- Ensure `NEXT_PUBLIC_APP_URL` is set correctly
- Check CORS settings if using custom domain
- Verify Railway proxy timeout (default: 5 minutes)

---

## Security Checklist

- ✅ Set strong `BETTER_AUTH_SECRET`
- ✅ Set strong `CRON_SECRET`
- ✅ Use environment variables (never commit secrets)
- ✅ Enable Railway's automatic HTTPS
- ✅ Restrict database access to Railway network
- ✅ Use Resend's domain verification for emails

---

## Useful Commands

```bash
# Deploy
railway up

# Run migrations
railway run npx prisma migrate deploy

# Access database
railway run npx prisma studio

# View logs
railway logs --tail

# SSH into container
railway shell
```

---

## Next Steps After Deployment

1. ✅ Verify database connection
2. ✅ Run Prisma migrations
3. ✅ Test Docketwise OAuth flow
4. ✅ Set up cron job for deadline notifications
5. ✅ Configure Resend email domain
6. ✅ Test SSE notifications
7. ✅ Monitor logs for errors

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- oRPC Docs: https://orpc.dev
