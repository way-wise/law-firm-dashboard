# Law Firm Dashboard - System Overhaul Plan

## 📋 Executive Summary

This plan outlines a complete system overhaul to focus on **paralegal KPI/performance monitoring** while maintaining Docketwise integration for essential data. The goal is to transform this into a **paralegal performance management system** with enhanced matter tracking.

---

## 🎯 Core Objectives

1. **Paralegal Performance Monitoring** - KPIs, metrics, charts for admin oversight
2. **Enhanced Matter Management** - Create/edit with Docketwise sync + edit protection
3. **Contact (Client) Management** - Full CRUD with documents on-demand
4. **Team Management** - Docketwise users (paralegals/attorneys)
5. **User Management** - Better-Auth users with admin roles
6. **Matter Types** - Dynamic from Docketwise with custom fields (Est. Days, Category)
7. **Categories** - Immigration categories (Employment, Humanitarian, Family, Citizenship)
8. **Dashboard Overhaul** - KPI charts replacing team overview

---

## 🗂️ Navigation Structure (After Overhaul)

```
📊 Dashboard (KPI metrics + performance charts)
📁 Matters (Full CRUD with Docketwise sync)
👥 Contacts (Clients with documents)
👔 Team (Docketwise users - paralegals/attorneys)
👤 Users (Better-Auth system users with roles)
📋 Matter Types (Dynamic with custom fields)
🏷️ Categories (Immigration categories)
🔔 Notifications (Already implemented)
⚙️ Settings (Sync, preferences)

❌ REMOVE: Documents, Invoices, Charges (not needed)
```

---

## 📡 Docketwise API Usage

### APIs We WILL Use:

| API                          | Purpose                                      |
| ---------------------------- | -------------------------------------------- |
| `GET /matters`               | List all matters (sync)                      |
| `GET /matters/:id`           | Single matter details (on-demand in sidebar) |
| `POST /matters`              | Create new matter                            |
| `PUT /matters/:id`           | Update matter                                |
| `GET /contacts`              | List all contacts/clients                    |
| `GET /contacts/:id`          | Single contact details                       |
| `POST /contacts`             | Create new contact                           |
| `PUT /contacts/:id`          | Update contact                               |
| `GET /documents?client_id=X` | Documents for a client (on-demand)           |
| `GET /users`                 | Team members (paralegals/attorneys)          |
| `GET /matter_types`          | Matter types with statuses                   |
| `GET /matter_statuses`       | Workflow stages                              |
| `GET /notes`                 | Notes for matters/clients                    |
| `POST /notes`                | Create notes                                 |

### APIs We WON'T Use:

- `GET /invoices` - Not needed
- `GET /charges` - Not needed
- `GET /countries` - Not needed

---

## 🏗️ Database Schema Updates

### New Models Needed:

```prisma
// Contacts (Clients) - synced from Docketwise
model contacts {
  id                  String    @id @default(ulid())
  docketwiseId        Int       @unique
  firstName           String?
  lastName            String?
  middleName          String?
  companyName         String?
  email               String?
  phone               String?
  type                String?   // "Person" or "Institution"
  isLead              Boolean   @default(false)

  // Address
  streetAddress       String?
  apartmentNumber     String?
  city                String?
  state               String?
  province            String?
  zipCode             String?
  country             String?

  // Custom fields (edit protected)
  customNotes         String?
  isEdited            Boolean   @default(false)
  editedBy            String?
  editedAt            DateTime?

  // Metadata
  lastSyncedAt        DateTime  @default(now())
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([docketwiseId])
}

// Matter Types - synced from Docketwise with custom fields
model matterTypes {
  id                  String    @id @default(ulid())
  docketwiseId        Int       @unique
  name                String

  // Custom fields (edit protected)
  estimatedDays       Int?      // Custom: Est. days to complete
  categoryId          String?   // Custom: Link to category
  category            categories? @relation(fields: [categoryId], references: [id])

  isEdited            Boolean   @default(false)
  editedBy            String?
  editedAt            DateTime?

  lastSyncedAt        DateTime  @default(now())
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  matterStatuses      matterStatuses[]

  @@index([docketwiseId])
}

// Matter Statuses (Workflow Stages) - synced from Docketwise
model matterStatuses {
  id                  String    @id @default(ulid())
  docketwiseId        Int       @unique
  name                String
  duration            Int?
  sort                Int?
  matterTypeId        String?
  matterType          matterTypes? @relation(fields: [matterTypeId], references: [id])

  lastSyncedAt        DateTime  @default(now())
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([docketwiseId])
}

// Categories - Static immigration categories
model categories {
  id          String    @id @default(ulid())
  name        String    @unique
  description String?
  color       String?   // For UI display
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  matterTypes matterTypes[]
}
```

### Seed Data for Categories:

```typescript
const categories = [
  { name: "Employment", description: "Employment-based immigration", color: "#3B82F6" },
  { name: "Humanitarian", description: "Asylum, refugee, TPS", color: "#EF4444" },
  { name: "Family", description: "Family-based immigration", color: "#10B981" },
  { name: "Citizenship", description: "Naturalization", color: "#8B5CF6" },
  { name: "Business", description: "Business immigration", color: "#F59E0B" },
  { name: "Other", description: "Other immigration matters", color: "#6B7280" },
];
```

---

## 📊 Dashboard Overhaul

### Current Dashboard:

- Stats cards (matters count, deadlines, etc.)
- Team overview with capacity bars ❌ REMOVE
- Matters table (basic)

### New Dashboard Design:

```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Active   │ │ Pending  │ │ Past Due │ │ Completed│            │
│  │ Cases    │ │ Deadlines│ │ Matters  │ │ This Mo. │            │
│  │   127    │ │    23    │ │    5     │ │    42    │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ PARALEGAL PERFORMANCE OVERVIEW                              ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                             ││
│  │  ┌─────────────────────┐  ┌─────────────────────┐          ││
│  │  │ Cases by Paralegal  │  │ On-Time Filing Rate │          ││
│  │  │ [Bar Chart]         │  │ [Gauge/Donut Chart] │          ││
│  │  │                     │  │                     │          ││
│  │  │ Sarah: ████████ 32  │  │     87%             │          ││
│  │  │ Mike:  ██████ 24    │  │                     │          ││
│  │  │ Lisa:  █████ 18     │  │                     │          ││
│  │  └─────────────────────┘  └─────────────────────┘          ││
│  │                                                             ││
│  │  ┌─────────────────────┐  ┌─────────────────────┐          ││
│  │  │ Avg Days to File    │  │ Deadline Compliance │          ││
│  │  │ [Line Chart]        │  │ [Stacked Bar]       │          ││
│  │  │                     │  │                     │          ││
│  │  │ Trend over 30 days  │  │ On-time vs Late     │          ││
│  │  └─────────────────────┘  └─────────────────────┘          ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ PARALEGAL LEADERBOARD                                       ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Rank │ Paralegal    │ Cases │ On-Time │ Avg Days │ Status  ││
│  │──────┼──────────────┼───────┼─────────┼──────────┼─────────││
│  │ 🥇 1 │ Sarah Johnson│  32   │  94%    │  12.3    │ ✅ Good ││
│  │ 🥈 2 │ Mike Chen    │  24   │  88%    │  14.1    │ ✅ Good ││
│  │ 🥉 3 │ Lisa Park    │  18   │  72%    │  18.5    │ ⚠️ Watch││
│  │   4  │ John Smith   │  15   │  60%    │  22.0    │ ❌ Alert││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ RECENT MATTERS (Dynamic Table - same as Matters page)      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### KPI Metrics to Track:

1. **Cases per Paralegal** - Bar chart showing workload distribution
2. **On-Time Filing Rate** - Percentage of cases filed before deadline
3. **Average Days to File** - Mean time from assignment to completion
4. **Deadline Compliance** - On-time vs late filings over time
5. **Case Status Distribution** - Pie chart of active/pending/completed
6. **Performance Trend** - Line chart of metrics over 30/60/90 days
7. **Alerts** - Paralegals with concerning metrics

---

## 📁 Matters Page Enhancements

### Current:

- Table with basic fields
- View sidebar with limited info

### New Features:

1. **Create Matter** - Form that:
   - Posts to Docketwise API
   - Creates local record with `isEdited: true`
   - Assigns custom fields (deadline, paralegal, etc.)

2. **View Sidebar Enhancement**:
   - Show basic info immediately (title, client, status)
   - Loading state for middle section
   - Fetch `GET /matters/:id` for full details:
     - Notes
     - Client avatar/info
     - Full description
     - Receipts
     - Assigned users
     - Workflow history

3. **Edit Protection**:
   - `isEdited: true` prevents sync overwrite
   - Show "Edited" badge on modified matters
   - Allow "Reset to Docketwise" action

---

## 👥 Contacts (Clients) Page

### Features:

1. **List View** - Table with search/filter
2. **Create Contact** - Posts to Docketwise + local DB
3. **Edit Contact** - With edit protection
4. **View Sidebar**:
   - Contact details
   - **Documents Tab** - On-demand fetch from `GET /documents?client_id=X`
   - Notes
   - Related matters

---

## 👔 Team Page (Docketwise Users)

### Current:

- Lists Docketwise users

### Keep As-Is:

- This is for viewing paralegals/attorneys from Docketwise
- Used for assigning matters
- Shows in KPI metrics

---

## 👤 Users Page (System Users)

### New Page Using Better-Auth:

- List system users who can log in
- Role management (Admin, Manager, Viewer)
- Invite new users
- Disable/enable accounts

### Better-Auth Admin Plugin:

```typescript
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    admin({
      defaultRole: "user",
      adminRole: "admin",
    }),
  ],
});
```

### Roles:

- **Admin** - Full access, manage users, view all KPIs
- **Manager** - View KPIs, manage matters
- **User** - Basic access, view assigned matters

---

## 📋 Matter Types Page

### Current:

- Static list with custom deadline days

### New Features:

1. **Sync from Docketwise** - `GET /matter_types`
2. **Custom Fields**:
   - `estimatedDays` - Days to complete this type
   - `category` - Link to immigration category
3. **Edit Protection** - Like matters
4. **Workflow Stages** - Show associated statuses

---

## 🏷️ Categories Page (New)

### Static Immigration Categories:

- Employment
- Humanitarian
- Family
- Citizenship
- Business
- Other

### Features:

- CRUD for categories
- Color coding
- Sort order
- Link to matter types

---

## 🗑️ Pages to Remove

1. **Documents** - Not needed (documents shown in Contact sidebar)
2. **Invoices** - Not needed
3. **Charges** - Not needed

---

## 🔄 Implementation Phases

### Phase 1: Database & Schema (Day 1)

- [ ] Add `contacts` model
- [ ] Add `matterTypes` model with custom fields
- [ ] Add `matterStatuses` model
- [ ] Add `categories` model
- [ ] Run migrations
- [ ] Seed categories

### Phase 2: Remove Unused Pages (Day 1)

- [ ] Delete `app/dashboard/documents`
- [ ] Delete `app/dashboard/invoices`
- [ ] Delete `app/dashboard/charges`
- [ ] Update navigation

### Phase 3: Dashboard Overhaul (Day 2-3)

- [ ] Remove Team Overview section
- [ ] Add KPI charts (use Recharts or similar)
- [ ] Add Paralegal Leaderboard
- [ ] Replace static matters table with dynamic one
- [ ] Create KPI calculation service

### Phase 4: Matters Enhancement (Day 3-4)

- [ ] Create Matter form (POST to Docketwise)
- [ ] Enhanced view sidebar with on-demand fetch
- [ ] Edit protection UI improvements

### Phase 5: Contacts Page (Day 4-5)

- [ ] Sync contacts from Docketwise
- [ ] Create/Edit with Docketwise API
- [ ] Documents tab in sidebar (on-demand)
- [ ] Edit protection

### Phase 6: Matter Types & Categories (Day 5)

- [ ] Sync matter types from Docketwise
- [ ] Add custom fields (Est. Days, Category)
- [ ] Categories CRUD
- [ ] Edit protection

### Phase 7: Users Page (Day 6)

- [ ] Better-Auth admin plugin setup
- [ ] Users list with roles
- [ ] Invite/manage users
- [ ] Role-based access control

### Phase 8: Testing & Polish (Day 7)

- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] UI polish
- [ ] Documentation

---

## 📦 Dependencies to Add

```bash
pnpm add recharts  # For KPI charts
# Better-Auth admin plugin is built-in
```

---

## 🎨 UI Components Needed

1. **KPI Cards** - Stat cards with trends
2. **Bar Chart** - Cases by paralegal
3. **Donut/Gauge Chart** - On-time rate
4. **Line Chart** - Trends over time
5. **Leaderboard Table** - Ranked paralegals
6. **Create Matter Dialog** - Form with Docketwise fields
7. **Documents List** - For contact sidebar
8. **Category Badges** - Colored tags

---

## 🔐 Shared Docketwise OAuth

As per your requirement:

- One user with Docketwise OAuth credentials
- All system users share this connection
- OAuth tokens stored in `accounts` table
- Refresh token handling for long-lived access

---

## ✅ Success Criteria

1. Admin can see paralegal performance at a glance
2. Matters can be created and synced with Docketwise
3. Edit protection prevents sync from overwriting custom data
4. Contacts show documents on-demand
5. Matter types have custom deadline estimates
6. System users have role-based access
7. KPI charts show meaningful performance metrics
8. Notifications work for deadlines

---

## 📝 Notes

- **No WebSocket** - Using SSE for real-time (already implemented)
- **No Resend** - Using Nodemailer with SMTP (already implemented)
- **Railway Deployment** - SSE compatible (already documented)
- **oRPC** - All APIs follow oRPC best practices (already implemented)

---

_This plan prioritizes paralegal performance monitoring while maintaining essential Docketwise integration._
