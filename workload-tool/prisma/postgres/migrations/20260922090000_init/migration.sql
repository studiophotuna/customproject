-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Agent" (
    "id" UUID NOT NULL,
    "adUpn" VARCHAR(256) NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "concurrentCap" INTEGER NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaRule" (
    "id" UUID NOT NULL,
    "ticketType" VARCHAR(100) NOT NULL,
    "slaMinutes" INTEGER NOT NULL,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SlaRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "source" VARCHAR(20) NOT NULL,
    "externalRef" VARCHAR(400),
    "subject" VARCHAR(400) NOT NULL,
    "body" TEXT,
    "ticketType" VARCHAR(100) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "currentAssigneeId" UUID,
    "onHoldSince" TIMESTAMP(3),
    "holdAccumulatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "holdReason" VARCHAR(400),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "reason" VARCHAR(20) NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "ticketId" UUID,
    "actor" VARCHAR(256) NOT NULL,
    "event" VARCHAR(40) NOT NULL,
    "detailsJson" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailboxConfig" (
    "id" UUID NOT NULL,
    "address" VARCHAR(256) NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MailboxConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRule" (
    "id" UUID NOT NULL,
    "mailboxId" UUID NOT NULL,
    "matchKind" VARCHAR(20) NOT NULL,
    "matchValue" VARCHAR(256) NOT NULL,
    "ticketType" VARCHAR(100) NOT NULL,
    "ruleOrder" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "IngestionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_adUpn_key" ON "Agent"("adUpn");

-- CreateIndex
CREATE INDEX "Shift_agentId_startsAt_endsAt_idx" ON "Shift"("agentId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlaRule_ticketType_key" ON "SlaRule"("ticketType");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_externalRef_key" ON "Ticket"("externalRef");

-- CreateIndex
CREATE INDEX "Ticket_status_dueAt_receivedAt_idx" ON "Ticket"("status", "dueAt", "receivedAt");

-- CreateIndex
CREATE INDEX "Assignment_ticketId_idx" ON "Assignment"("ticketId");

-- CreateIndex
CREATE INDEX "Assignment_agentId_unassignedAt_idx" ON "Assignment"("agentId", "unassignedAt");

-- CreateIndex
CREATE INDEX "AuditLog_ticketId_at_idx" ON "AuditLog"("ticketId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "MailboxConfig_address_key" ON "MailboxConfig"("address");

-- CreateIndex
CREATE INDEX "IngestionRule_mailboxId_ruleOrder_idx" ON "IngestionRule"("mailboxId", "ruleOrder");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_currentAssigneeId_fkey" FOREIGN KEY ("currentAssigneeId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRule" ADD CONSTRAINT "IngestionRule_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "MailboxConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

