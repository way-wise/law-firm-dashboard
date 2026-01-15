# Notification System Implementation Plan

## 📋 Requirements

### **Email Notifications**

- Send automated email reminders for upcoming deadlines
- Configurable notification timing (e.g., 7 days, 3 days, 1 day before deadline)
- Email content includes matter details, deadline date, assigned paralegal
- Track sent notifications to avoid duplicates

### **Real-time In-App Notifications**

- Bell icon in header showing notification count
- Dropdown panel with recent notifications
- Mark as read/unread functionality
- Click notification to view matter details
- Real-time updates without page refresh

---

## 🏗️ Architecture

### **1. Database Schema** (Already exists!)

```prisma
model deadlineNotifications {
  id               String   @id @default(ulid())
  matterId         String
  matter           matters  @relation(fields: [matterId], references: [id])
  sentAt           DateTime @default(now())
  recipientEmail   String
  notificationType String   // "email" | "in-app"

  @@index([matterId])
  @@index([sentAt])
}
```

**Need to add:**

- `isRead` boolean for in-app notifications
- `daysBeforeDeadline` to track which reminder (7d, 3d, 1d)
- `subject` and `message` for email content

### **2. Email Service Integration**

**Options:**

- **Resend** (recommended - simple, modern, generous free tier)
- **SendGrid** (enterprise-grade)
- **AWS SES** (cost-effective at scale)

**Implementation:**

- Create email templates for deadline reminders
- Use React Email for beautiful, responsive emails
- Queue system for batch sending
- Retry logic for failed sends

### **3. Notification Scheduling**

**Cron Job / Scheduled Task:**

- Run daily (or every few hours)
- Check for matters with upcoming deadlines
- Send notifications based on configured intervals
- Mark notifications as sent to avoid duplicates

**Logic:**

```typescript
// Check for deadlines in 7, 3, and 1 days
const upcomingDeadlines = await prisma.matters.findMany({
  where: {
    estimatedDeadline: {
      gte: startOfDay(addDays(new Date(), 1)),
      lte: endOfDay(addDays(new Date(), 7))
    },
    isStale: false
  }
})

// For each matter, check if notification already sent
// If not, send email and create in-app notification
```

### **4. In-App Notification System**

**Components:**

- `NotificationBell` - Header icon with badge count
- `NotificationPanel` - Dropdown with notification list
- `NotificationItem` - Individual notification card

**State Management:**

- Use React Query for real-time data fetching
- Poll for new notifications every 30 seconds
- Optimistic updates for mark as read

**API Routes:**

- `GET /api/notifications` - Fetch user's notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `DELETE /api/notifications/:id` - Dismiss notification

---

## 📝 Implementation Steps

### **Phase 1: Database Updates**

1. ✅ Update `deadlineNotifications` schema
2. ✅ Add migration for new fields
3. ✅ Update Prisma types

### **Phase 2: Email Service Setup**

1. Install Resend SDK and React Email
2. Create email templates
3. Set up environment variables
4. Create email sending utility function
5. Test email delivery

### **Phase 3: Notification Scheduler**

1. Create cron job/scheduled function
2. Implement deadline checking logic
3. Create notification records
4. Send emails for upcoming deadlines
5. Add logging and error handling

### **Phase 4: In-App Notifications**

1. Create notification API routes
2. Build NotificationBell component
3. Build NotificationPanel component
4. Add real-time polling
5. Implement mark as read functionality
6. Add click-to-view matter details

### **Phase 5: User Settings**

1. Add notification preferences page
2. Allow users to configure:
   - Email notification intervals (7d, 3d, 1d)
   - Enable/disable email notifications
   - Enable/disable in-app notifications
3. Store preferences in database

### **Phase 6: Testing & Polish**

1. Test email delivery
2. Test notification scheduling
3. Test in-app notifications
4. Add notification sound (optional)
5. Add browser notifications (optional)

---

## 🎨 UI Design

### **Notification Bell (Header)**

```
┌─────────────────────────────┐
│  [Logo]  Dashboard    [🔔3] │  ← Badge shows unread count
└─────────────────────────────┘
```

### **Notification Panel (Dropdown)**

```
┌──────────────────────────────────────┐
│ Notifications                    [×] │
├──────────────────────────────────────┤
│ 🔴 Matter "John Doe AOS" deadline    │
│    in 3 days (Jan 18, 2026)          │
│    Assigned to: Sarah Johnson        │
│    2 hours ago                       │
├──────────────────────────────────────┤
│ ⚪ Matter "Smith I-485" deadline     │
│    in 7 days (Jan 22, 2026)          │
│    Assigned to: Mike Chen            │
│    1 day ago                         │
├──────────────────────────────────────┤
│           View All Notifications     │
└──────────────────────────────────────┘
```

### **Email Template**

```
Subject: Deadline Reminder: [Matter Title] - [X] days remaining

Hi [Paralegal Name],

This is a reminder that the deadline for the following matter is approaching:

Matter: [Matter Title]
Client: [Client Name]
Matter Type: [Matter Type]
Deadline: [Deadline Date] ([X] days from now)
Workflow Stage: [Stage]

Please ensure all necessary actions are completed before the deadline.

View Matter Details: [Link to Dashboard]

---
Law Firm Dashboard
```

---

## 🔧 Technical Stack

- **Email Service**: Resend
- **Email Templates**: React Email
- **Scheduling**: Vercel Cron (for Vercel) or node-cron (for self-hosted)
- **Real-time Updates**: React Query with polling
- **Notifications**: Custom React components
- **State Management**: React Query + Zustand (optional)

---

## 📊 Notification Rules

### **Default Intervals**

- **7 days before** - First reminder
- **3 days before** - Second reminder
- **1 day before** - Final reminder
- **On deadline day** - Urgent reminder

### **Notification Recipients**

- Assigned paralegal (primary)
- Matter owner (if different)
- Admin users (optional, configurable)

### **Notification Content**

- Matter title and client name
- Deadline date and days remaining
- Current workflow stage
- Link to matter details
- Assigned paralegal name

---

## 🚀 Future Enhancements

1. **SMS Notifications** - Twilio integration
2. **Slack/Teams Integration** - Post to team channels
3. **Custom Notification Rules** - Per matter type
4. **Escalation Logic** - Notify supervisor if no action
5. **Digest Emails** - Daily/weekly summary
6. **Browser Push Notifications** - Web Push API
7. **Mobile App Notifications** - React Native

---

## ✅ Success Metrics

- Email delivery rate > 95%
- Notification latency < 5 minutes
- Zero duplicate notifications
- User engagement with notifications > 60%
- Reduced missed deadlines by 80%

---

## 🔐 Security & Privacy

- Only send notifications to authorized users
- Encrypt sensitive data in emails
- Comply with email regulations (CAN-SPAM, GDPR)
- Rate limiting to prevent spam
- Audit trail for all sent notifications

---

## 💰 Cost Estimate

**Resend Pricing:**

- Free tier: 3,000 emails/month
- Pro: $20/month for 50,000 emails
- Enterprise: Custom pricing

**Expected Usage:**

- 50 matters × 3 reminders each = 150 emails/month
- Well within free tier for small firms
- Scalable to thousands of matters

---

## 📅 Timeline

- **Week 1**: Database updates, email service setup
- **Week 2**: Notification scheduler, email templates
- **Week 3**: In-app notification UI
- **Week 4**: Testing, polish, deployment

**Total: 4 weeks for full implementation**
