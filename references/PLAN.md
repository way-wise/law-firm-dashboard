# Law Firm Dashboard - Project Plan

## Project Overview

A custom law practice management dashboard that integrates with Docketwise API while providing enhanced customization, paralegal KPI tracking, and deadline management capabilities that Docketwise lacks.

### Core Objectives

1. **Hybrid Data Management**: Sync Docketwise data while allowing custom field overrides
2. **Paralegal Performance Tracking**: KPI metrics for paralegal productivity and case management
3. **Enhanced Deadline Management**: Custom deadline tracking with automated notifications
4. **Dashboard Analytics**: Visual metrics showing case status, paralegal throughput, and firm performance

---

## Architecture Strategy

### Data Sync Approach

**Problem**: Docketwise API does not provide webhooks for real-time updates.

**Solution**: Implement scheduled polling with intelligent sync tracking.

#### Sync Strategy

- **Polling Interval**: User-configurable (5, 10, 15, 20, 30 minutes, or 1 hour)
- **Configuration UI**: Settings modal in Integrations tab with polling interval selector
- **Sync Tracking**: Track last sync timestamp and Docketwise `updated_at` fields
- **Incremental Updates**: Only fetch matters updated since last sync
- **Manual Refresh**: Allow users to trigger immediate sync
- **Background Jobs**: Use cron jobs or scheduled tasks for automatic syncing
- **Rate Limiting**: Warning about server resources and API call limitations for frequent polling

#### Data Flow

```
Docketwise API → Polling Service → Local Database → Dashboard UI
                                         ↓
                                  Custom Fields
                                  (Admin Editable)
```

---

## Database Schema Design

### New Tables

#### `matters` Table

Stores synced Docketwise data + custom fields

```prisma
model matters {
  id                    String    @id @default(ulid())

  // Docketwise Data (synced)
  docketwiseId          Int       @unique
  docketwiseUpdatedAt   DateTime?
  title                 String
  matterType            String?
  matterTypeId          Int?
  workflowStage         String?
  workflowStageId       Int?
  clientName            String?
  clientId              Int?
  status                String?
  statusId              Int?
  openedAt              DateTime?
  closedAt              DateTime?

  // Custom Fields (admin editable)
  assignedDate          DateTime?
  estimatedDeadline     DateTime?
  actualDeadline        DateTime?
  billingStatus         BillingStatus?
  paralegalAssigned     String?
  customNotes           String?

  // Metadata
  lastSyncedAt          DateTime  @default(now())
  isStale               Boolean   @default(false)
  userId                String
  user                  users     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  deadlineNotifications deadlineNotifications[]

  @@index([docketwiseId])
  @@index([userId])
  @@index([assignedDate])
  @@index([estimatedDeadline])
  @@index([isStale])
}

enum BillingStatus {
  PAID
  DEPOSIT_PAID
  PAYMENT_PLAN
  DUE
}
```

#### `matterTypeDeadlines` Table

Admin-defined deadlines per matter type

```prisma
model matterTypeDeadlines {
  id              String   @id @default(ulid())
  matterType      String
  matterTypeId    Int?
  deadlineDays    Int      // Days from assigned date to deadline
  description     String?
  userId          String
  user            users    @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, matterType])
  @@index([userId])
}
```

#### `deadlineNotifications` Table

Track sent notifications to avoid duplicates

```prisma
model deadlineNotifications {
  id          String   @id @default(ulid())
  matterId    String
  matter      matters  @relation(fields: [matterId], references: [id], onDelete: Cascade)
  sentAt      DateTime @default(now())
  recipientEmail String
  notificationType String // "PAST_DEADLINE", "APPROACHING_DEADLINE"

  @@index([matterId])
  @@index([sentAt])
}
```

#### `syncLogs` Table

Track sync operations for debugging

```prisma
model syncLogs {
  id              String   @id @default(ulid())
  syncType        String   // "MATTERS", "CONTACTS", etc.
  status          String   // "SUCCESS", "FAILED", "PARTIAL"
  recordsProcessed Int     @default(0)
  recordsUpdated  Int      @default(0)
  recordsCreated  Int      @default(0)
  errorMessage    String?
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  userId          String?

  @@index([syncType, startedAt])
}
```

#### `paralegalMetrics` Table

Calculated KPI metrics per paralegal

```prisma
model paralegalMetrics {
  id                    String   @id @default(ulid())
  paralegalName         String
  periodStart           DateTime
  periodEnd             DateTime

  // Metrics
  totalMatters          Int      @default(0)
  completedMatters      Int      @default(0)
  staleMatters          Int      @default(0)
  pastDeadlineMatters   Int      @default(0)
  avgDaysToFile         Float?
  onTimeFilingRate      Float?   // Percentage

  calculatedAt          DateTime @default(now())
  userId                String
  user                  users    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([paralegalName, periodStart])
  @@index([userId])
}
```

#### `syncSettings` Table

User-specific sync configuration

```prisma
model syncSettings {
  id              String   @id @default(ulid())
  userId          String   @unique
  user            users    @relation(fields: [userId], references: [id], onDelete: Cascade)
  pollingInterval Int      @default(30) // Minutes
  lastSyncAt      DateTime?
  isEnabled       Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
}
```

---

## Feature Implementation Plan

### Phase 1: Data Sync Foundation (Week 1-2)

#### 1.1 Database Setup

- [ ] Create Prisma schema with new tables
- [ ] Add `syncSettings` table for user-specific polling configuration
- [ ] Run migrations
- [ ] Update seed data if needed

#### 1.2 Sync Settings Router (oRPC)

- [ ] Create `router/syncSettings.ts` following `todos.ts` pattern
- [ ] Implement routes (OpenAPI compliant):
  - `getSyncSettings` - Get user's sync configuration
  - `updateSyncSettings` - Update polling interval
  - `triggerManualSync` - Trigger immediate sync
- [ ] Use `authorized.route()` for all endpoints
- [ ] Add input/output schemas with Zod
- [ ] Export router in `router/index.ts`

#### 1.3 Sync Service

- [ ] Create `lib/sync/docketwise-sync.ts`
- [ ] Implement matter sync logic
  - Fetch matters from Docketwise
  - Compare with local database
  - Create/update records
  - Track sync metadata
- [ ] Add error handling and logging
- [ ] Respect user's polling interval from `syncSettings`

#### 1.4 Scheduled Sync

- [ ] Set up cron job or scheduled task
- [ ] Read polling interval from user's `syncSettings`
- [ ] Execute sync based on user's configuration
- [ ] Add manual sync trigger via oRPC endpoint

### Phase 2: Custom Matter Fields (Week 2-3)

#### 2.1 Matter Type Deadlines Management

- [ ] Create admin page for matter type deadline configuration
- [ ] CRUD operations for `matterTypeDeadlines`
- [ ] UI: Table with matter types and deadline days
- [ ] Auto-calculate `estimatedDeadline` based on `assignedDate`

#### 2.2 Matter Edit Functionality

- [ ] Update matters table to show custom fields
- [ ] Create matter edit modal/sheet
- [ ] Editable fields:
  - Assigned Date
  - Estimated Deadline
  - Billing Status (dropdown)
  - Paralegal Assigned
  - Custom Notes
- [ ] Validation and save logic
- [ ] Preserve Docketwise data (read-only display)

#### 2.3 Matter Detail View

- [ ] Create matter detail page/sheet
- [ ] Show Docketwise data (read-only)
- [ ] Show custom fields (editable)
- [ ] Display workflow stages from Docketwise
- [ ] Show deadline status (on-time, approaching, past due)

### Phase 3: Deadline Notifications (Week 3-4)

#### 3.1 Deadline Detection Service

- [ ] Create `lib/notifications/deadline-checker.ts`
- [ ] Daily cron job to check deadlines
- [ ] Identify past-deadline matters
- [ ] Identify approaching deadlines (e.g., 3 days before)

#### 3.2 Email Notification System

- [ ] Set up email service (Resend recommended for Next.js)
- [ ] Create `lib/email/send-email.ts` utility
- [ ] Create email templates in `lib/email/templates/`
  - `deadline-past.tsx` - Past deadline notification
  - `deadline-approaching.tsx` - Approaching deadline reminder
- [ ] Email content:

  ```
  Subject: Action Required – Past Deadline

  Hello Attorney,

  The matter [Matter Type] for [Client Name] is past the set deadline.

  Matter Details:
  - Matter: [Title]
  - Client: [Client Name]
  - Assigned Date: [Date]
  - Deadline: [Date]
  - Days Overdue: [X]
  - Paralegal: [Name]

  Please provide an explanation as to why this filing has not yet been completed.

  Thank you.
  ```

- [ ] Track sent notifications to avoid duplicates
- [ ] Admin settings for notification recipients

#### 3.3 Real-Time Notifications (oRPC Publisher)

- [ ] Install `@orpc/experimental-publisher`
- [ ] Create `lib/notifications/publisher.ts`
- [ ] Set up MemoryPublisher or Redis-based publisher
- [ ] Create notification router `router/notifications.ts`:
  - `subscribeToNotifications` - Stream notifications using async generator
  - `markAsRead` - Mark notification as read
  - `getUnreadCount` - Get unread notification count
- [ ] Use oRPC Event Iterator pattern on client
- [ ] Create notification badge in header with real-time updates
- [ ] Notification center showing deadline alerts
- [ ] Publish events when:
  - Deadline is approaching
  - Deadline is past
  - Matter is updated
  - Sync completes

### Phase 4: KPI Dashboard (Week 4-5)

#### 4.1 Metrics Calculation Service

- [ ] Create `lib/analytics/kpi-calculator.ts`
- [ ] Calculate paralegal metrics:
  - Total matters assigned
  - Completed matters
  - Stale matters (no activity > X days)
  - Past deadline matters
  - Average days to file
  - On-time filing rate
- [ ] Store in `paralegalMetrics` table
- [ ] Run calculations daily/weekly

#### 4.2 Dashboard Overview Page

- [ ] Large metric cards (inspired by reference image):
  - **New Matters (MTD)**: Count with % change
  - **Total Caseload**: Current active matters
  - **Approval Rate**: Percentage of approved cases
  - **RFE Frequency**: Request for Evidence count
  - **Stale Cases**: Large number display
  - **Past Deadline Cases**: Large number display
  - **Avg Days to File**: Firm-wide average
- [ ] Trend charts:
  - Adjudication trends (monthly)
  - Matter status breakdown
- [ ] Filters: Date range, matter type, paralegal

#### 4.3 Paralegal Throughput View

- [ ] Bar chart showing paralegal performance
- [ ] Metrics per paralegal:
  - Inbound matters
  - Outbound (filed) matters
  - Completion rate
- [ ] Color coding for performance levels
- [ ] Drill-down to individual paralegal details

#### 4.4 Stale Cases Widget

- [ ] Define "stale" criteria (e.g., no update in 30 days)
- [ ] Large number display
- [ ] Click to view list of stale cases
- [ ] Filter by paralegal

### Phase 5: UI/UX Enhancements (Week 5-6)

#### 5.1 Polling Configuration UI

- [ ] Add settings icon button in Integrations tab (after connection status)
- [ ] Create `SyncSettingsModal` component
- [ ] Modal content:
  - Heading: "Sync Configuration"
  - Description explaining polling concept
  - Warning about frequent polling (server resources, API limits)
  - Select dropdown with options: 5, 10, 15, 20, 30 minutes, 1 hour
  - Save button
- [ ] Use oRPC client to fetch/update sync settings
- [ ] Show current polling interval
- [ ] Display last sync timestamp
- [ ] Add manual sync button

#### 5.2 Matters Table Improvements

- [ ] Keep current dark theme design
- [ ] Add columns:
  - Assigned Date
  - Deadline
  - Days Until Deadline (color-coded)
  - Billing Status
  - Paralegal Assigned
- [ ] Status badges (color-coded)
- [ ] Sorting and filtering
- [ ] Bulk actions (if needed)

#### 5.2 Dashboard Widgets

- [ ] Implement large number displays for key metrics
- [ ] Use icons sparingly (as per client feedback)
- [ ] Focus on data visualization over decorative elements
- [ ] Responsive design for different screen sizes

#### 5.3 Admin Settings

- [ ] Matter type deadline configuration
- [ ] Notification settings
- [ ] Sync interval configuration
- [ ] User/paralegal management

---

## Technical Implementation Details

### Sync Service Architecture

```typescript
// lib/sync/docketwise-sync.ts

export async function syncMatters(userId: string) {
  const syncLog = await createSyncLog('MATTERS', userId);

  try {
    // Get last sync timestamp
    const lastSync = await getLastSyncTimestamp(userId, 'MATTERS');

    // Fetch matters from Docketwise (with pagination)
    const token = await getDocketwiseToken(userId);
    if (!token) throw new Error('No Docketwise token');

    let page = 1;
    let hasMore = true;
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;

    while (hasMore) {
      const response = await fetch(
        `${DOCKETWISE_API_URL}/matters?page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      const matters = Array.isArray(data) ? data : data.data;

      for (const docketwiseMatter of matters) {
        // Check if matter exists locally
        const existingMatter = await prisma.matters.findUnique({
          where: { docketwiseId: docketwiseMatter.id },
        });

        if (existingMatter) {
          // Update if Docketwise data is newer
          if (
            !existingMatter.docketwiseUpdatedAt ||
            new Date(docketwiseMatter.updated_at) > existingMatter.docketwiseUpdatedAt
          ) {
            await updateMatterFromDocketwise(existingMatter.id, docketwiseMatter);
            recordsUpdated++;
          }
        } else {
          // Create new matter
          await createMatterFromDocketwise(userId, docketwiseMatter);
          recordsCreated++;
        }

        recordsProcessed++;
      }

      // Check for next page
      hasMore = data.pagination?.next_page !== null;
      page++;
    }

    await completeSyncLog(syncLog.id, {
      status: 'SUCCESS',
      recordsProcessed,
      recordsCreated,
      recordsUpdated,
    });

    return { success: true, recordsProcessed, recordsCreated, recordsUpdated };
  } catch (error) {
    await completeSyncLog(syncLog.id, {
      status: 'FAILED',
      errorMessage: error.message,
    });

    throw error;
  }
}
```

### Deadline Notification Service

```typescript
// lib/notifications/deadline-checker.ts

export async function checkAndNotifyDeadlines() {
  const today = new Date();

  // Find past deadline matters
  const pastDeadlineMatters = await prisma.matters.findMany({
    where: {
      estimatedDeadline: {
        lt: today,
      },
      closedAt: null, // Only open matters
    },
    include: {
      user: true,
      deadlineNotifications: {
        where: {
          notificationType: 'PAST_DEADLINE',
          sentAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      },
    },
  });

  for (const matter of pastDeadlineMatters) {
    // Skip if already notified recently
    if (matter.deadlineNotifications.length > 0) continue;

    // Send email notification
    await sendDeadlineEmail({
      to: matter.user.email, // Or attorney email
      subject: 'Action Required – Past Deadline',
      matterTitle: matter.title,
      clientName: matter.clientName,
      matterType: matter.matterType,
      assignedDate: matter.assignedDate,
      deadline: matter.estimatedDeadline,
      paralegal: matter.paralegalAssigned,
    });

    // Log notification
    await prisma.deadlineNotifications.create({
      data: {
        matterId: matter.id,
        recipientEmail: matter.user.email,
        notificationType: 'PAST_DEADLINE',
      },
    });
  }
}
```

### Sync Settings Router (oRPC)

```typescript
// router/syncSettings.ts

import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import { syncMatters } from "@/lib/sync/docketwise-sync";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

// Sync settings schema
const syncSettingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  pollingInterval: z.number().int().min(5).max(60),
  lastSyncAt: z.date().nullable(),
  isEnabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const updateSyncSettingsSchema = z.object({
  pollingInterval: z.number().int().min(5).max(60),
});

// Get Sync Settings
export const getSyncSettings = authorized
  .route({
    method: "GET",
    path: "/sync/settings",
    summary: "Get user's sync configuration",
    tags: ["Sync"],
  })
  .output(syncSettingsSchema)
  .handler(async ({ context }) => {
    let settings = await prisma.syncSettings.findUnique({
      where: { userId: context.user.id },
    });

    if (!settings) {
      settings = await prisma.syncSettings.create({
        data: {
          userId: context.user.id,
          pollingInterval: 30,
          isEnabled: true,
        },
      });
    }

    return settings;
  });

// Update Sync Settings
export const updateSyncSettings = authorized
  .route({
    method: "PATCH",
    path: "/sync/settings",
    summary: "Update polling interval",
    tags: ["Sync"],
  })
  .input(updateSyncSettingsSchema)
  .output(syncSettingsSchema)
  .handler(async ({ input, context }) => {
    const settings = await prisma.syncSettings.upsert({
      where: { userId: context.user.id },
      update: {
        pollingInterval: input.pollingInterval,
      },
      create: {
        userId: context.user.id,
        pollingInterval: input.pollingInterval,
        isEnabled: true,
      },
    });

    return settings;
  });

// Trigger Manual Sync
export const triggerManualSync = authorized
  .route({
    method: "POST",
    path: "/sync/trigger",
    summary: "Trigger immediate sync",
    tags: ["Sync"],
  })
  .output(z.object({
    success: z.boolean(),
    recordsProcessed: z.number(),
    recordsCreated: z.number(),
    recordsUpdated: z.number(),
  }))
  .handler(async ({ context }) => {
    const result = await syncMatters(context.user.id);

    await prisma.syncSettings.update({
      where: { userId: context.user.id },
      data: { lastSyncAt: new Date() },
    });

    return result;
  });
```

### Notifications Router (oRPC Publisher)

```typescript
// router/notifications.ts

import { authorized } from "@/lib/orpc";
import { notificationPublisher } from "@/lib/notifications/publisher";
import prisma from "@/lib/prisma";
import { ORPCError } from "@orpc/server";
import * as z from "zod";

const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(["DEADLINE_PAST", "DEADLINE_APPROACHING", "MATTER_UPDATED", "SYNC_COMPLETE"]),
  title: z.string(),
  message: z.string(),
  matterId: z.string().optional(),
  isRead: z.boolean(),
  createdAt: z.date(),
});

// Subscribe to real-time notifications
export const subscribeToNotifications = authorized
  .route({
    method: "GET",
    path: "/notifications/subscribe",
    summary: "Subscribe to real-time notifications",
    tags: ["Notifications"],
  })
  .handler(async function* ({ context, signal }) {
    const userId = context.user.id;
    const iterator = notificationPublisher.subscribe(
      `user:${userId}:notifications`,
      { signal }
    );

    for await (const notification of iterator) {
      yield notification;
    }
  });

// Get unread notification count
export const getUnreadCount = authorized
  .route({
    method: "GET",
    path: "/notifications/unread-count",
    summary: "Get unread notification count",
    tags: ["Notifications"],
  })
  .output(z.object({ count: z.number() }))
  .handler(async ({ context }) => {
    const count = await prisma.notifications.count({
      where: {
        userId: context.user.id,
        isRead: false,
      },
    });

    return { count };
  });

// Mark notification as read
export const markAsRead = authorized
  .route({
    method: "PATCH",
    path: "/notifications/{id}/read",
    summary: "Mark notification as read",
    tags: ["Notifications"],
  })
  .input(z.object({ id: z.string() }))
  .output(notificationSchema)
  .handler(async ({ input, context }) => {
    const notification = await prisma.notifications.findUnique({
      where: { id: input.id },
    });

    if (!notification || notification.userId !== context.user.id) {
      throw new ORPCError("NOT_FOUND", {
        message: "Notification not found",
      });
    }

    return await prisma.notifications.update({
      where: { id: input.id },
      data: { isRead: true },
    });
  });
```

### Notification Publisher Setup

```typescript
// lib/notifications/publisher.ts

import { MemoryPublisher } from "@orpc/experimental-publisher";

type NotificationEvents = Record<string, {
  id: string;
  type: "DEADLINE_PAST" | "DEADLINE_APPROACHING" | "MATTER_UPDATED" | "SYNC_COMPLETE";
  title: string;
  message: string;
  matterId?: string;
  isRead: boolean;
  createdAt: Date;
}>;

export const notificationPublisher = new MemoryPublisher<NotificationEvents>();

// Helper to publish notification
export async function publishNotification(
  userId: string,
  notification: Omit<NotificationEvents[string], "id" | "isRead" | "createdAt">
) {
  const fullNotification = {
    ...notification,
    id: crypto.randomUUID(),
    isRead: false,
    createdAt: new Date(),
  };

  // Save to database
  await prisma.notifications.create({
    data: {
      ...fullNotification,
      userId,
    },
  });

  // Publish to subscribers
  await notificationPublisher.publish(
    `user:${userId}:notifications`,
    fullNotification
  );
}
```

### Client-Side Usage (Event Iterator)

```typescript
// app/dashboard/_components/notification-listener.tsx
"use client";

import { client } from "@/lib/orpc/client";
import { consumeEventIterator } from "@orpc/client";
import { useEffect, useState } from "react";

export function NotificationListener() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const cancel = consumeEventIterator(
      client.notifications.subscribeToNotifications(undefined, {
        signal: controller.signal,
      }),
      {
        onEvent: (notification) => {
          console.log("New notification:", notification);
          setUnreadCount((prev) => prev + 1);
          // Show toast or update UI
        },
        onError: (error) => {
          console.error("Notification stream error:", error);
        },
      }
    );

    return () => {
      controller.abort();
      cancel();
    };
  }, []);

  return (
    <div className="notification-badge">
      {unreadCount > 0 && <span>{unreadCount}</span>}
    </div>
  );
}
```

### KPI Calculation Service

```typescript
// lib/analytics/kpi-calculator.ts

export async function calculateParalegalMetrics(
  paralegalName: string,
  periodStart: Date,
  periodEnd: Date,
  userId: string
) {
  const matters = await prisma.matters.findMany({
    where: {
      paralegalAssigned: paralegalName,
      userId,
      assignedDate: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  const totalMatters = matters.length;
  const completedMatters = matters.filter(m => m.closedAt !== null).length;
  const staleMatters = matters.filter(m => isStale(m)).length;
  const pastDeadlineMatters = matters.filter(
    m => m.estimatedDeadline && m.estimatedDeadline < new Date() && !m.closedAt
  ).length;

  // Calculate average days to file
  const filedMatters = matters.filter(m => m.closedAt && m.assignedDate);
  const avgDaysToFile = filedMatters.length > 0
    ? filedMatters.reduce((sum, m) => {
        const days = Math.floor(
          (m.closedAt.getTime() - m.assignedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0) / filedMatters.length
    : null;

  // Calculate on-time filing rate
  const onTimeFilingRate = totalMatters > 0
    ? ((totalMatters - pastDeadlineMatters) / totalMatters) * 100
    : null;

  return await prisma.paralegalMetrics.create({
    data: {
      paralegalName,
      periodStart,
      periodEnd,
      totalMatters,
      completedMatters,
      staleMatters,
      pastDeadlineMatters,
      avgDaysToFile,
      onTimeFilingRate,
      userId,
    },
  });
}
```

---

## API Endpoints

### Sync Endpoints

- `POST /api/sync/matters` - Trigger manual sync
- `GET /api/sync/status` - Get last sync status
- `GET /api/sync/logs` - Get sync history

### Matter Endpoints

- `GET /api/matters` - List matters (with filters)
- `GET /api/matters/:id` - Get matter details
- `PATCH /api/matters/:id` - Update custom fields
- `POST /api/matters/:id/notes` - Add custom notes

### Admin Endpoints

- `GET /api/admin/matter-type-deadlines` - List deadlines
- `POST /api/admin/matter-type-deadlines` - Create deadline
- `PATCH /api/admin/matter-type-deadlines/:id` - Update deadline
- `DELETE /api/admin/matter-type-deadlines/:id` - Delete deadline

### Analytics Endpoints

- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/paralegal/:name` - Paralegal metrics
- `GET /api/analytics/stale-cases` - List stale cases

### Notification Endpoints

- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read

---

## Environment Variables

```env
# Docketwise Sync
SYNC_INTERVAL_MINUTES=30
STALE_CASE_DAYS=30

# Email Notifications
EMAIL_SERVICE=resend
EMAIL_FROM=notifications@lawfirm.com
EMAIL_API_KEY=your_api_key

# Notification Recipients
ATTORNEY_EMAIL=attorney@lawfirm.com
ADMIN_EMAIL=admin@lawfirm.com
```

---

## UI Components Structure

```
app/
├── dashboard/
│   ├── page.tsx                    # Dashboard overview with KPI widgets
│   ├── matters/
│   │   ├── page.tsx                # Matters list (current)
│   │   ├── [id]/
│   │   │   └── page.tsx            # Matter detail view
│   │   └── _components/
│   │       ├── matter-edit-sheet.tsx
│   │       ├── matter-detail-view.tsx
│   │       └── deadline-badge.tsx
│   ├── analytics/
│   │   ├── page.tsx                # Analytics dashboard
│   │   └── _components/
│   │       ├── kpi-cards.tsx
│   │       ├── paralegal-throughput.tsx
│   │       └── adjudication-trends.tsx
│   ├── admin/
│   │   ├── matter-types/
│   │   │   └── page.tsx            # Matter type deadline config
│   │   └── sync/
│   │       └── page.tsx            # Sync management
│   └── notifications/
│       └── page.tsx                # Notification center

components/
├── dashboard/
│   ├── metric-card.tsx             # Large number display widget
│   ├── stale-cases-widget.tsx
│   └── trend-chart.tsx
└── notifications/
    ├── notification-badge.tsx
    └── notification-list.tsx
```

---

## Testing Strategy

### Unit Tests

- Sync service logic
- KPI calculation functions
- Deadline detection logic
- Email template rendering

### Integration Tests

- Docketwise API integration
- Database operations
- Email sending
- Cron job execution

### E2E Tests

- Matter sync flow
- Matter editing
- Deadline notification flow
- Dashboard metric display

---

## Deployment Considerations

### Cron Jobs Setup

- Use Vercel Cron (if on Vercel)
- Or use external cron service (cron-job.org, EasyCron)
- Or use Node.js scheduler (node-cron) with persistent process

### Database Migrations

- Run migrations before deployment
- Backup database before major schema changes
- Test migrations on staging environment

### Performance Optimization

- Index frequently queried fields
- Implement pagination for large datasets
- Cache dashboard metrics (Redis/Upstash)
- Lazy load matter details

---

## Timeline Summary

| Phase                  | Duration  | Deliverables                                   |
| ---------------------- | --------- | ---------------------------------------------- |
| Phase 1: Data Sync     | 1-2 weeks | Sync service, scheduled polling, manual sync   |
| Phase 2: Custom Fields | 1-2 weeks | Matter editing, deadline config, custom fields |
| Phase 3: Notifications | 1 week    | Email alerts, deadline detection               |
| Phase 4: KPI Dashboard | 1-2 weeks | Analytics, metrics, paralegal tracking         |
| Phase 5: UI Polish     | 1 week    | Enhanced tables, widgets, responsive design    |

**Total Estimated Time**: 5-7 weeks

---

## Success Metrics

- [ ] Matters sync automatically every 30 minutes
- [ ] Admin can configure deadlines per matter type
- [ ] Admin can edit custom fields on any matter
- [ ] Attorneys receive email alerts for past-deadline matters
- [ ] Dashboard displays real-time KPI metrics
- [ ] Paralegal throughput is tracked and visualized
- [ ] Stale cases are identified and highlighted
- [ ] System maintains Docketwise data integrity while allowing customization

---

## Future Enhancements

- Client portal integration
- Document management
- Billing integration
- Advanced reporting and exports
- Mobile app
- AI-powered case predictions
- Automated workflow suggestions
