-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WorkSession" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "WorkSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "ticketId" UUID,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "note" VARCHAR(400),

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" VARCHAR(80) NOT NULL,
    "value" VARCHAR(400) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "description" VARCHAR(400),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" VARCHAR(256),

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "WorkSession_agentId_startedAt_idx" ON "WorkSession"("agentId", "startedAt");

-- CreateIndex
CREATE INDEX "WorkSession_agentId_endedAt_idx" ON "WorkSession"("agentId", "endedAt");

-- CreateIndex
CREATE INDEX "ActivityLog_sessionId_startedAt_idx" ON "ActivityLog"("sessionId", "startedAt");

-- CreateIndex
CREATE INDEX "ActivityLog_ticketId_idx" ON "ActivityLog"("ticketId");

-- CreateIndex
CREATE INDEX "ActivityLog_kind_startedAt_idx" ON "ActivityLog"("kind", "startedAt");

-- AddForeignKey
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
