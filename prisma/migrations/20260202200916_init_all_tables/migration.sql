-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('pending', 'completed');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PAID', 'DEPOSIT_PAID', 'PAYMENT_PLAN', 'DUE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT DEFAULT 'user',
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueTime" TIMESTAMP(3),
    "status" "TodoStatus" NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syncSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pollingInterval" INTEGER NOT NULL DEFAULT 30,
    "staleMeasurementDays" INTEGER NOT NULL DEFAULT 10,
    "lastSyncAt" TIMESTAMP(3),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syncSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matters" (
    "id" TEXT NOT NULL,
    "docketwiseId" INTEGER NOT NULL,
    "docketwiseNumber" TEXT,
    "docketwiseCreatedAt" TIMESTAMP(3),
    "docketwiseUpdatedAt" TIMESTAMP(3),
    "priorityDate" TIMESTAMP(3),
    "priorityDateStatus" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "matterType" TEXT,
    "matterTypeId" INTEGER,
    "status" TEXT,
    "statusId" INTEGER,
    "statusForFiling" TEXT,
    "statusForFilingId" INTEGER,
    "clientName" TEXT,
    "clientId" INTEGER,
    "teamId" INTEGER,
    "assignees" TEXT,
    "docketwiseUserIds" TEXT,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "discardedAt" TIMESTAMP(3),
    "assignedDate" TIMESTAMP(3),
    "estimatedDeadline" TIMESTAMP(3),
    "actualDeadline" TIMESTAMP(3),
    "billingStatus" "BillingStatus",
    "totalHours" DOUBLE PRECISION,
    "flatFee" DOUBLE PRECISION,
    "customNotes" TEXT,
    "rfeCount" INTEGER NOT NULL DEFAULT 0,
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastQualityCheck" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedBy" TEXT,
    "editedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matterTypeDeadlines" (
    "id" TEXT NOT NULL,
    "matterType" TEXT NOT NULL,
    "matterTypeId" INTEGER,
    "deadlineDays" INTEGER NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matterTypeDeadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deadlineNotifications" (
    "id" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipientEmail" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "daysBeforeDeadline" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "deadlineNotifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paralegalMetrics" (
    "id" TEXT NOT NULL,
    "paralegalName" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalMatters" INTEGER NOT NULL DEFAULT 0,
    "completedMatters" INTEGER NOT NULL DEFAULT 0,
    "staleMatters" INTEGER NOT NULL DEFAULT 0,
    "pastDeadlineMatters" INTEGER NOT NULL DEFAULT 0,
    "avgDaysToFile" DOUBLE PRECISION,
    "onTimeFilingRate" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "paralegalMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "docketwiseId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "teamType" TEXT NOT NULL DEFAULT 'inHouse',
    "title" TEXT,
    "availableHoursPerWeek" DOUBLE PRECISION,
    "utilizationTarget" DOUBLE PRECISION,
    "performanceIndex" DOUBLE PRECISION,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "docketwiseId" INTEGER NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "middleName" TEXT,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "streetAddress" TEXT,
    "apartmentNumber" TEXT,
    "city" TEXT,
    "state" TEXT,
    "province" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "customNotes" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedBy" TEXT,
    "editedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matterTypes" (
    "id" TEXT NOT NULL,
    "docketwiseId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedDays" INTEGER,
    "complexityWeight" INTEGER NOT NULL DEFAULT 1,
    "flatFee" DOUBLE PRECISION,
    "categoryId" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedBy" TEXT,
    "editedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matterTypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matterStatuses" (
    "id" TEXT NOT NULL,
    "docketwiseId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER,
    "sort" INTEGER,
    "matterTypeId" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matterStatuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statusGroups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statusGroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statusGroupMappings" (
    "id" TEXT NOT NULL,
    "statusGroupId" TEXT NOT NULL,
    "matterStatusId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statusGroupMappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailRfe" BOOLEAN NOT NULL DEFAULT true,
    "emailApproval" BOOLEAN NOT NULL DEFAULT true,
    "emailDenial" BOOLEAN NOT NULL DEFAULT true,
    "emailStatusChange" BOOLEAN NOT NULL DEFAULT false,
    "emailDeadlines" BOOLEAN NOT NULL DEFAULT true,
    "inAppRfe" BOOLEAN NOT NULL DEFAULT true,
    "inAppApproval" BOOLEAN NOT NULL DEFAULT true,
    "inAppDenial" BOOLEAN NOT NULL DEFAULT true,
    "inAppStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "inAppDeadlines" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificationRecipients" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificationRecipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syncProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "lastSyncedId" INTEGER,
    "lastSyncDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'idle',
    "failureReason" TEXT,
    "totalProcessed" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "syncProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboardStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalMatters" INTEGER NOT NULL DEFAULT 0,
    "activeMattersCount" INTEGER NOT NULL DEFAULT 0,
    "newMattersThisMonth" INTEGER NOT NULL DEFAULT 0,
    "criticalMatters" INTEGER NOT NULL DEFAULT 0,
    "rfeFrequency" INTEGER NOT NULL DEFAULT 0,
    "overdueMatters" INTEGER NOT NULL DEFAULT 0,
    "avgDaysToFile" DOUBLE PRECISION,
    "estRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unassigned" INTEGER NOT NULL DEFAULT 0,
    "newMattersGrowth" TEXT,
    "weightedActiveMatters" INTEGER NOT NULL DEFAULT 0,
    "revenueAtRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deadlineComplianceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCycleTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paralegalUtilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "atRiskMatters" INTEGER NOT NULL DEFAULT 0,
    "unassignedMatters" INTEGER NOT NULL DEFAULT 0,
    "overloadedParalegals" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collectedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageMatterValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matterVelocity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onTimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "teamUtilization" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgRfeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReworkCount" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAvailableHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAssignedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBillableHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mattersTrend" INTEGER,
    "revenueTrend" INTEGER,
    "deadlineMissTrend" INTEGER,
    "mattersWithoutPricing" INTEGER NOT NULL DEFAULT 0,
    "mattersWithoutDeadline" INTEGER NOT NULL DEFAULT 0,
    "mattersWithoutMatterType" INTEGER NOT NULL DEFAULT 0,
    "dataQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "totalContacts" INTEGER NOT NULL DEFAULT 0,
    "totalMatterTypes" INTEGER NOT NULL DEFAULT 0,
    "teamMembers" INTEGER NOT NULL DEFAULT 0,
    "categories" INTEGER NOT NULL DEFAULT 0,
    "activeTeamMembers" INTEGER NOT NULL DEFAULT 0,
    "matterTypesWithWorkflow" INTEGER NOT NULL DEFAULT 0,
    "editedMatters" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboardStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_token_idx" ON "sessions"("userId", "token");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "syncSettings_userId_key" ON "syncSettings"("userId");

-- CreateIndex
CREATE INDEX "syncSettings_userId_idx" ON "syncSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "matters_docketwiseId_key" ON "matters"("docketwiseId");

-- CreateIndex
CREATE INDEX "matters_docketwiseId_idx" ON "matters"("docketwiseId");

-- CreateIndex
CREATE INDEX "matters_userId_idx" ON "matters"("userId");

-- CreateIndex
CREATE INDEX "matters_teamId_idx" ON "matters"("teamId");

-- CreateIndex
CREATE INDEX "matters_assignedDate_idx" ON "matters"("assignedDate");

-- CreateIndex
CREATE INDEX "matters_estimatedDeadline_idx" ON "matters"("estimatedDeadline");

-- CreateIndex
CREATE INDEX "matters_isStale_idx" ON "matters"("isStale");

-- CreateIndex
CREATE INDEX "matters_status_idx" ON "matters"("status");

-- CreateIndex
CREATE INDEX "matters_matterType_idx" ON "matters"("matterType");

-- CreateIndex
CREATE INDEX "matters_clientId_idx" ON "matters"("clientId");

-- CreateIndex
CREATE INDEX "matters_userId_status_idx" ON "matters"("userId", "status");

-- CreateIndex
CREATE INDEX "matters_userId_teamId_idx" ON "matters"("userId", "teamId");

-- CreateIndex
CREATE INDEX "matters_teamId_status_idx" ON "matters"("teamId", "status");

-- CreateIndex
CREATE INDEX "matters_isStale_userId_idx" ON "matters"("isStale", "userId");

-- CreateIndex
CREATE INDEX "matters_docketwiseId_userId_idx" ON "matters"("docketwiseId", "userId");

-- CreateIndex
CREATE INDEX "matters_archived_idx" ON "matters"("archived");

-- CreateIndex
CREATE INDEX "matters_userId_archived_idx" ON "matters"("userId", "archived");

-- CreateIndex
CREATE INDEX "matterTypeDeadlines_userId_idx" ON "matterTypeDeadlines"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "matterTypeDeadlines_userId_matterType_key" ON "matterTypeDeadlines"("userId", "matterType");

-- CreateIndex
CREATE INDEX "deadlineNotifications_matterId_idx" ON "deadlineNotifications"("matterId");

-- CreateIndex
CREATE INDEX "deadlineNotifications_userId_isRead_idx" ON "deadlineNotifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "deadlineNotifications_sentAt_idx" ON "deadlineNotifications"("sentAt");

-- CreateIndex
CREATE INDEX "paralegalMetrics_paralegalName_periodStart_idx" ON "paralegalMetrics"("paralegalName", "periodStart");

-- CreateIndex
CREATE INDEX "paralegalMetrics_userId_idx" ON "paralegalMetrics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_docketwiseId_key" ON "teams"("docketwiseId");

-- CreateIndex
CREATE INDEX "teams_docketwiseId_idx" ON "teams"("docketwiseId");

-- CreateIndex
CREATE INDEX "teams_isActive_idx" ON "teams"("isActive");

-- CreateIndex
CREATE INDEX "teams_teamType_idx" ON "teams"("teamType");

-- CreateIndex
CREATE INDEX "teams_email_idx" ON "teams"("email");

-- CreateIndex
CREATE INDEX "teams_fullName_idx" ON "teams"("fullName");

-- CreateIndex
CREATE INDEX "teams_isActive_teamType_idx" ON "teams"("isActive", "teamType");

-- CreateIndex
CREATE INDEX "teams_isActive_email_idx" ON "teams"("isActive", "email");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_docketwiseId_key" ON "contacts"("docketwiseId");

-- CreateIndex
CREATE INDEX "contacts_docketwiseId_idx" ON "contacts"("docketwiseId");

-- CreateIndex
CREATE INDEX "contacts_lastName_firstName_idx" ON "contacts"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "matterTypes_docketwiseId_key" ON "matterTypes"("docketwiseId");

-- CreateIndex
CREATE INDEX "matterTypes_docketwiseId_idx" ON "matterTypes"("docketwiseId");

-- CreateIndex
CREATE INDEX "matterTypes_categoryId_idx" ON "matterTypes"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "matterStatuses_docketwiseId_key" ON "matterStatuses"("docketwiseId");

-- CreateIndex
CREATE INDEX "matterStatuses_docketwiseId_idx" ON "matterStatuses"("docketwiseId");

-- CreateIndex
CREATE INDEX "matterStatuses_matterTypeId_idx" ON "matterStatuses"("matterTypeId");

-- CreateIndex
CREATE INDEX "statusGroups_userId_idx" ON "statusGroups"("userId");

-- CreateIndex
CREATE INDEX "statusGroups_userId_isActive_idx" ON "statusGroups"("userId", "isActive");

-- CreateIndex
CREATE INDEX "statusGroups_displayOrder_idx" ON "statusGroups"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "statusGroups_userId_name_key" ON "statusGroups"("userId", "name");

-- CreateIndex
CREATE INDEX "statusGroupMappings_statusGroupId_idx" ON "statusGroupMappings"("statusGroupId");

-- CreateIndex
CREATE INDEX "statusGroupMappings_matterStatusId_idx" ON "statusGroupMappings"("matterStatusId");

-- CreateIndex
CREATE UNIQUE INDEX "statusGroupMappings_statusGroupId_matterStatusId_key" ON "statusGroupMappings"("statusGroupId", "matterStatusId");

-- CreateIndex
CREATE UNIQUE INDEX "notificationSettings_userId_key" ON "notificationSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notificationRecipients_userId_key" ON "notificationRecipients"("userId");

-- CreateIndex
CREATE INDEX "syncProgress_userId_syncType_idx" ON "syncProgress"("userId", "syncType");

-- CreateIndex
CREATE INDEX "syncProgress_status_idx" ON "syncProgress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "syncProgress_userId_syncType_key" ON "syncProgress"("userId", "syncType");

-- CreateIndex
CREATE UNIQUE INDEX "dashboardStats_userId_key" ON "dashboardStats"("userId");

-- CreateIndex
CREATE INDEX "dashboardStats_userId_idx" ON "dashboardStats"("userId");

-- CreateIndex
CREATE INDEX "dashboardStats_lastSyncedAt_idx" ON "dashboardStats"("lastSyncedAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syncSettings" ADD CONSTRAINT "syncSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matters" ADD CONSTRAINT "matters_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("docketwiseId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matters" ADD CONSTRAINT "matters_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matters" ADD CONSTRAINT "matters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matterTypeDeadlines" ADD CONSTRAINT "matterTypeDeadlines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlineNotifications" ADD CONSTRAINT "deadlineNotifications_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "matters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlineNotifications" ADD CONSTRAINT "deadlineNotifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paralegalMetrics" ADD CONSTRAINT "paralegalMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matterTypes" ADD CONSTRAINT "matterTypes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matterTypes" ADD CONSTRAINT "matterTypes_editedBy_fkey" FOREIGN KEY ("editedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matterStatuses" ADD CONSTRAINT "matterStatuses_matterTypeId_fkey" FOREIGN KEY ("matterTypeId") REFERENCES "matterTypes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statusGroupMappings" ADD CONSTRAINT "statusGroupMappings_statusGroupId_fkey" FOREIGN KEY ("statusGroupId") REFERENCES "statusGroups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statusGroupMappings" ADD CONSTRAINT "statusGroupMappings_matterStatusId_fkey" FOREIGN KEY ("matterStatusId") REFERENCES "matterStatuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationSettings" ADD CONSTRAINT "notificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationRecipients" ADD CONSTRAINT "notificationRecipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboardStats" ADD CONSTRAINT "dashboardStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
