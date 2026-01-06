# Immigration Law Firm Dashboard - Comprehensive Plan

## Overview

A complete immigration law firm case management system with role-based access control, workflow state machine, KPI tracking, and full CRUD operations for all entities.

---

## 1. User & Role System (better-auth)

### Roles (using better-auth admin plugin)

| Role        | Description                           | Permissions                                     |
| ----------- | ------------------------------------- | ----------------------------------------------- |
| `admin`     | Platform super admin                  | Full control over everything                    |
| `moderator` | Office manager/supervisor             | Manage users, matters, view all data            |
| `paralegal` | Case workers (in-house or contractor) | Handle assigned matters, update workflows       |
| `client`    | Immigration clients                   | View own matters, upload documents, communicate |

### User Model (better-auth default + extensions)

```prisma
model users {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  phone         String?   // Added field
  role          String?   // "admin", "moderator", "paralegal", "client" (comma-separated for multiple)
  banned        Boolean?
  banReason     String?
  banExpires    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  clientProfile    clients?      // Only if role includes "client"
  workerProfile    workers?      // Only if role includes "paralegal" or "moderator"
  assignedMatters  matters[]     @relation("AssignedWorker")
  activities       activities[]
}
```

---

## 2. Data Models

### 2.1 Clients (Extended profile for client role users)

```prisma
model clients {
  id              String   @id @default(ulid())
  userId          String   @unique
  user            users    @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Basic Info (some duplicated from users for quick access)
  dateOfBirth     DateTime?
  nationality     String?
  currentStatus   String?  // e.g., "H1B", "F1", "Tourist", etc.

  // Address
  address         Json?    // { street, city, state, zip, country }

  // Documents & Extra Fields (flexible JSON for any additional data)
  documents       Json?    // [{ type, url, uploadedAt, status }]
  additionalInfo  Json?    // Any extra fields needed

  // Relations
  matters         matters[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 2.2 Workers (Extended profile for paralegal/moderator users)

```prisma
model workers {
  id              String    @id @default(ulid())
  userId          String    @unique
  user            users     @relation(fields: [userId], references: [id], onDelete: Cascade)

  teamType        TeamType  @default(in_house)  // in_house, contractor
  title           String?   // "Senior Paralegal", "Immigration Specialist", etc.
  specializations String[]  // ["H1B", "Green Card", "Asylum"]
  hourlyRate      Decimal?  // For contractors
  isActive        Boolean   @default(true)

  // KPI Metrics (calculated/cached)
  totalCasesHandled   Int   @default(0)
  activeCases         Int   @default(0)
  avgResolutionDays   Float @default(0)
  clientSatisfaction  Float @default(0)  // Average rating

  // Relations
  assignedMatters matters[]
  activities      activities[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum TeamType {
  in_house
  contractor
}
```

### 2.3 Matter Types (CRUD - Not Enum)

```prisma
model matter_types {
  id              String    @id @default(ulid())
  name            String    @unique  // "I-485 Green Card", "H1B Petition"
  code            String    @unique  // "I485", "H1B"
  description     String?
  category        String?   // "Employment", "Family", "Humanitarian"
  estimatedDays   Int?      // Average processing time
  requiredDocs    Json?     // [{ name, description, required }]
  isActive        Boolean   @default(true)

  // Relations
  matters         matters[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### 2.4 Workflow Stages (CRUD - Configurable)

```prisma
model workflow_stages {
  id              String    @id @default(ulid())
  name            String    @unique  // "Intake", "Document Collection", "Drafting", etc.
  code            String    @unique  // "INTAKE", "DOC_COLLECTION", "DRAFTING"
  description     String?
  order           Int       // For ordering in UI
  color           String?   // For UI display
  icon            String?   // Icon name
  isTerminal      Boolean   @default(false)  // Is this a final stage?
  isActive        Boolean   @default(true)

  // Relations
  workflowHistory workflow_history[]
  currentMatters  matters[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Default Workflow Stages:**

1. `INTAKE` - Initial client intake
2. `DOC_COLLECTION` - Gathering required documents
3. `DRAFTING` - Preparing application
4. `REVIEW` - Internal review
5. `FILED` - Submitted to USCIS/Agency
6. `PENDING` - Awaiting response
7. `RFE` - Request for Evidence (optional loop)
8. `APPROVED` - Case approved ✓ (terminal)
9. `DENIED` - Case denied ✗ (terminal)
10. `WITHDRAWN` - Client withdrew (terminal)

### 2.5 Matters (Cases)

```prisma
model matters {
  id              String    @id @default(ulid())
  caseNumber      String    @unique  // Auto-generated: "M-2024-0001"

  // Relations
  clientId        String
  client          clients   @relation(fields: [clientId], references: [id])

  matterTypeId    String
  matterType      matter_types @relation(fields: [matterTypeId], references: [id])

  assignedWorkerId String?
  assignedWorker  workers?  @relation(fields: [assignedWorkerId], references: [id])

  currentStageId  String
  currentStage    workflow_stages @relation(fields: [currentStageId], references: [id])

  // Billing
  billingStatus   BillingStatus @default(pending)
  totalFee        Decimal?
  paidAmount      Decimal?  @default(0)

  // Dates
  intakeDate      DateTime  @default(now())
  filedDate       DateTime?
  decisionDate    DateTime?
  dueDate         DateTime?

  // Communication Metrics
  inboundCalls    Int       @default(0)
  outboundCalls   Int       @default(0)
  emails          Int       @default(0)

  // Client Feedback
  rating          Int?      // 1-5
  feedback        String?

  // Notes & Documents
  notes           String?
  documents       Json?     // [{ type, url, uploadedAt }]

  // Priority & Flags
  priority        Priority  @default(normal)
  isUrgent        Boolean   @default(false)

  // Relations
  workflowHistory workflow_history[]
  activities      activities[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum BillingStatus {
  pending
  partial
  paid
  overdue
  waived
}

enum Priority {
  low
  normal
  high
  urgent
}
```

### 2.6 Workflow History (State Machine Timeline)

```prisma
model workflow_history {
  id              String    @id @default(ulid())

  matterId        String
  matter          matters   @relation(fields: [matterId], references: [id], onDelete: Cascade)

  stageId         String
  stage           workflow_stages @relation(fields: [stageId], references: [id])

  // State Machine
  enteredAt       DateTime  @default(now())
  exitedAt        DateTime?
  durationMinutes Int?      // Calculated on exit

  // Who made the change
  changedById     String?
  changedBy       users?    @relation(fields: [changedById], references: [id])

  // Notes for this transition
  notes           String?

  createdAt       DateTime  @default(now())
}
```

### 2.7 Activities (Audit Log & Communication)

```prisma
model activities {
  id              String    @id @default(ulid())

  matterId        String
  matter          matters   @relation(fields: [matterId], references: [id], onDelete: Cascade)

  // Who performed the action
  performedById   String?
  performedBy     users?    @relation(fields: [performedById], references: [id])

  // Activity Details
  type            ActivityType
  title           String
  description     String?
  metadata        Json?     // Additional data specific to activity type

  occurredAt      DateTime  @default(now())

  createdAt       DateTime  @default(now())
}

enum ActivityType {
  // Communication
  inbound_call
  outbound_call
  email_sent
  email_received
  sms_sent
  sms_received
  client_portal_message

  // Documents
  document_uploaded
  document_requested
  document_approved
  document_rejected

  // Workflow
  stage_changed
  worker_assigned
  worker_unassigned

  // Billing
  payment_received
  invoice_sent

  // Notes
  note_added

  // System
  matter_created
  matter_updated
  reminder_sent

  // Feedback
  review_received
}
```

### 2.8 Notifications

```prisma
model notifications {
  id              String    @id @default(ulid())

  userId          String
  user            users     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type            String    // "stage_change", "assignment", "reminder", etc.
  title           String
  message         String
  link            String?   // URL to navigate to

  isRead          Boolean   @default(false)
  readAt          DateTime?

  createdAt       DateTime  @default(now())
}
```

---

## 3. API Routes Structure (oRPC)

```
/rpc
├── auth/                    # better-auth handles this
├── admin/                   # Admin operations (better-auth admin plugin)
│
├── users/                   # User management
│   ├── get                  # List users with filters
│   ├── getById              # Get single user
│   ├── update               # Update user
│   └── delete               # Delete user
│
├── clients/                 # Client profiles
│   ├── get                  # List clients
│   ├── getById              # Get single client with matters
│   ├── create               # Create client (creates user + client profile)
│   ├── update               # Update client profile
│   └── delete               # Delete client
│
├── workers/                 # Worker profiles
│   ├── get                  # List workers
│   ├── getById              # Get single worker with KPIs
│   ├── create               # Create worker profile
│   ├── update               # Update worker
│   ├── delete               # Delete worker
│   └── getKPIs              # Get worker KPI dashboard
│
├── matterTypes/             # Matter type management
│   ├── get                  # List matter types
│   ├── getById              # Get single matter type
│   ├── create               # Create matter type
│   ├── update               # Update matter type
│   └── delete               # Delete/deactivate matter type
│
├── workflowStages/          # Workflow stage management
│   ├── get                  # List stages (ordered)
│   ├── getById              # Get single stage
│   ├── create               # Create stage
│   ├── update               # Update stage
│   ├── delete               # Delete/deactivate stage
│   └── reorder              # Reorder stages
│
├── matters/                 # Case management
│   ├── get                  # List matters with filters
│   ├── getById              # Get single matter with full details
│   ├── create               # Create new matter
│   ├── update               # Update matter
│   ├── delete               # Delete matter
│   ├── assign               # Assign worker to matter
│   ├── changeStage          # Move to next/specific stage
│   ├── getStats             # Dashboard statistics
│   └── getTimeline          # Get workflow timeline for a matter
│
├── activities/              # Activity log
│   ├── get                  # List activities for a matter
│   ├── create               # Log new activity
│   └── getRecent            # Get recent activities across all matters
│
└── notifications/           # Notification management
    ├── get                  # Get user notifications
    ├── markRead             # Mark as read
    └── markAllRead          # Mark all as read
```

---

## 4. UI Flow & Pages

### 4.1 Page Structure

```
/                           # Landing/Login page
/dashboard                  # Main dashboard (role-based view)
│
├── /clients                # Client management
│   ├── (list)              # Client list with search/filter
│   ├── /new                # Add new client
│   └── /[id]               # Client detail/edit
│
├── /team                   # Worker/Team management
│   ├── (list)              # Team list with filters
│   ├── /new                # Add new team member
│   └── /[id]               # Worker detail/edit with KPIs
│
├── /matters                # Case management
│   ├── (list)              # Matter list with filters
│   ├── /new                # Create new matter (wizard)
│   └── /[id]               # Matter detail with timeline
│
├── /settings               # System settings
│   ├── /matter-types       # Manage matter types
│   ├── /workflow-stages    # Manage workflow stages
│   ├── /team-types         # Manage team types
│   └── /profile            # User profile settings
│
└── /admin                  # Admin-only pages
    ├── /users              # User management
    └── /audit              # Audit logs
```

### 4.2 Dashboard Views (Role-Based)

#### Admin/Moderator Dashboard

- **Stats Cards**: Total Cases, Active Cases, Pending RFEs, Filed This Month, Approval Rate
- **Team Performance**: Worker cards with KPIs
- **Recent Activity**: Latest activities across all matters
- **Matters by Stage**: Visual pipeline/kanban view
- **Alerts**: Overdue matters, pending assignments

#### Paralegal Dashboard

- **My Cases**: Assigned matters with status
- **My KPIs**: Personal performance metrics
- **Today's Tasks**: Due items, follow-ups
- **Recent Activity**: On assigned matters

#### Client Dashboard

- **My Cases**: Their matters with current status
- **Timeline**: Visual progress of their case
- **Documents**: Upload/view documents
- **Messages**: Communication with team

### 4.3 Key UI Components

1. **Matter List Table**
   - Columns: Case #, Client, Type, Stage, Assigned To, Priority, Last Updated
   - Filters: Stage, Type, Worker, Date Range, Priority
   - Actions: View, Edit, Change Stage, Assign

2. **Matter Detail Page**
   - Header: Case info, client info, assigned worker
   - Tabs: Overview, Timeline, Documents, Activities, Billing
   - Timeline: Visual workflow history with dates and notes
   - Quick Actions: Change stage, add note, upload document

3. **New Matter Wizard**
   - Step 1: Select/Create Client
   - Step 2: Select Matter Type
   - Step 3: Upload Required Documents
   - Step 4: Assign Worker (optional)
   - Step 5: Review & Create

4. **Worker KPI Card**
   - Active Cases count
   - Avg Resolution Time
   - Client Satisfaction rating
   - Cases by Stage breakdown

5. **Workflow Stage Pipeline**
   - Kanban-style view of matters by stage
   - Drag-and-drop to change stage
   - Visual indicators for overdue/urgent

---

## 5. Notification System

### Trigger Events

| Event                | Notify                  |
| -------------------- | ----------------------- |
| New matter created   | Admin, Assigned Worker  |
| Worker assigned      | Worker, Client          |
| Stage changed        | Client, Assigned Worker |
| Document uploaded    | Assigned Worker         |
| Document requested   | Client                  |
| RFE received         | Client, Worker, Admin   |
| Case approved/denied | Client, Worker, Admin   |
| Payment received     | Admin                   |
| Matter overdue       | Worker, Admin           |

---

## 6. KPI Metrics

### Worker KPIs

- **Active Cases**: Current assigned matters
- **Total Cases Handled**: Lifetime count
- **Avg Resolution Time**: Days from intake to terminal stage
- **Client Satisfaction**: Average rating from completed cases
- **Cases by Stage**: Distribution of current cases
- **Response Time**: Avg time to first activity after assignment

### Firm KPIs

- **Total Active Cases**: All non-terminal matters
- **Approval Rate**: Approved / (Approved + Denied)
- **Avg Case Duration**: Days from intake to decision
- **Revenue**: Total fees collected
- **Cases by Type**: Distribution by matter type
- **Cases by Stage**: Pipeline view

---

## 7. Implementation Order

### Phase 1: Foundation

1. ✅ Update Prisma schema with new models
2. ⬜ Configure better-auth admin plugin with roles
3. ⬜ Create access control permissions
4. ⬜ Generate Prisma client and migrate database

### Phase 2: Core CRUD APIs

1. ⬜ Matter Types API (CRUD)
2. ⬜ Workflow Stages API (CRUD)
3. ⬜ Clients API (CRUD)
4. ⬜ Workers API (CRUD)
5. ⬜ Matters API (CRUD + workflow)
6. ⬜ Activities API

### Phase 3: Dashboard UI

1. ⬜ Update sidebar navigation
2. ⬜ Dashboard overview page (role-based)
3. ⬜ Stats cards component
4. ⬜ Team/Worker cards with KPIs

### Phase 4: Client Management

1. ⬜ Client list page
2. ⬜ Client detail/edit page
3. ⬜ New client form

### Phase 5: Team Management

1. ⬜ Team list page
2. ⬜ Worker detail page with KPIs
3. ⬜ New worker form

### Phase 6: Matter Management

1. ⬜ Matter list page with filters
2. ⬜ Matter detail page with timeline
3. ⬜ New matter wizard
4. ⬜ Stage change functionality

### Phase 7: Settings & Admin

1. ⬜ Matter types management
2. ⬜ Workflow stages management
3. ⬜ User management (admin)

### Phase 8: Polish

1. ⬜ Notifications system
2. ⬜ Seed data
3. ⬜ Testing & bug fixes

---

## 8. Tech Stack Summary

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: better-auth with admin plugin
- **API**: oRPC (type-safe RPC)
- **Validation**: Zod
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **State**: React hooks, URL state for filters
- **Forms**: React Hook Form + Zod resolver

---

## 9. File Structure

```
├── app/
│   ├── (auth)/              # Auth pages (login, register)
│   ├── dashboard/
│   │   ├── page.tsx         # Dashboard overview
│   │   ├── clients/
│   │   ├── team/
│   │   ├── matters/
│   │   ├── settings/
│   │   └── _components/
│   └── layout.tsx
│
├── components/
│   ├── ui/                  # Shadcn/Radix components
│   └── shared/              # Shared app components
│
├── lib/
│   ├── auth.ts              # better-auth config
│   ├── auth-client.ts       # Client auth
│   ├── permissions.ts       # Access control config
│   ├── prisma.ts            # Prisma client
│   └── orpc/                # oRPC setup
│
├── router/
│   ├── index.ts             # Main router
│   ├── clients.ts
│   ├── workers.ts
│   ├── matters.ts
│   ├── matterTypes.ts
│   ├── workflowStages.ts
│   └── activities.ts
│
├── schema/
│   ├── clientSchema.ts
│   ├── workerSchema.ts
│   ├── matterSchema.ts
│   └── ...
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
└── types/
    └── index.ts
```

---

## Notes

- **MatterType is a table, not enum** - Allows dynamic CRUD
- **WorkflowStage is a table, not enum** - Configurable stages with `isTerminal` flag for completed states
- **Activities serve as audit log** - Every action is tracked
- **Workflow History is the timeline** - Shows stage transitions with timestamps
- **All users in one table** - Role determines capabilities, extended profiles in separate tables
- **JSON fields for flexibility** - Documents, additional info can be extended without schema changes
