BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[Agent] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [adUpn] NVARCHAR(256) NOT NULL,
    [displayName] NVARCHAR(200) NOT NULL,
    [role] NVARCHAR(20) NOT NULL,
    [concurrentCap] INT NOT NULL CONSTRAINT [Agent_concurrentCap_df] DEFAULT 5,
    [active] BIT NOT NULL CONSTRAINT [Agent_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Agent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Agent_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Agent_adUpn_key] UNIQUE NONCLUSTERED ([adUpn])
);

-- CreateTable
CREATE TABLE [dbo].[Shift] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [agentId] UNIQUEIDENTIFIER NOT NULL,
    [startsAt] DATETIME2 NOT NULL,
    [endsAt] DATETIME2 NOT NULL,
    CONSTRAINT [Shift_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SlaRule] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [ticketType] NVARCHAR(100) NOT NULL,
    [slaMinutes] INT NOT NULL,
    [businessHoursOnly] BIT NOT NULL CONSTRAINT [SlaRule_businessHoursOnly_df] DEFAULT 1,
    [active] BIT NOT NULL CONSTRAINT [SlaRule_active_df] DEFAULT 1,
    CONSTRAINT [SlaRule_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [SlaRule_ticketType_key] UNIQUE NONCLUSTERED ([ticketType])
);

-- CreateTable
CREATE TABLE [dbo].[Ticket] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [source] NVARCHAR(20) NOT NULL,
    [externalRef] NVARCHAR(400),
    [subject] NVARCHAR(400) NOT NULL,
    [body] NVARCHAR(max),
    [ticketType] NVARCHAR(100) NOT NULL,
    [receivedAt] DATETIME2 NOT NULL,
    [dueAt] DATETIME2 NOT NULL,
    [status] NVARCHAR(20) NOT NULL,
    [currentAssigneeId] UNIQUEIDENTIFIER,
    [onHoldSince] DATETIME2,
    [holdAccumulatedMinutes] INT NOT NULL CONSTRAINT [Ticket_holdAccumulatedMinutes_df] DEFAULT 0,
    [holdReason] NVARCHAR(400),
    [resolvedAt] DATETIME2,
    [closedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Ticket_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Ticket_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Ticket_externalRef_key] UNIQUE NONCLUSTERED ([externalRef])
);

-- CreateTable
CREATE TABLE [dbo].[Assignment] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [ticketId] UNIQUEIDENTIFIER NOT NULL,
    [agentId] UNIQUEIDENTIFIER NOT NULL,
    [reason] NVARCHAR(20) NOT NULL,
    [assignedAt] DATETIME2 NOT NULL CONSTRAINT [Assignment_assignedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [unassignedAt] DATETIME2,
    CONSTRAINT [Assignment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [ticketId] UNIQUEIDENTIFIER,
    [actor] NVARCHAR(256) NOT NULL,
    [event] NVARCHAR(40) NOT NULL,
    [detailsJson] NVARCHAR(max),
    [at] DATETIME2 NOT NULL CONSTRAINT [AuditLog_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MailboxConfig] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [address] NVARCHAR(256) NOT NULL,
    [platform] NVARCHAR(20) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [MailboxConfig_active_df] DEFAULT 1,
    CONSTRAINT [MailboxConfig_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MailboxConfig_address_key] UNIQUE NONCLUSTERED ([address])
);

-- CreateTable
CREATE TABLE [dbo].[IngestionRule] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [mailboxId] UNIQUEIDENTIFIER NOT NULL,
    [matchKind] NVARCHAR(20) NOT NULL,
    [matchValue] NVARCHAR(256) NOT NULL,
    [ticketType] NVARCHAR(100) NOT NULL,
    [ruleOrder] INT NOT NULL CONSTRAINT [IngestionRule_ruleOrder_df] DEFAULT 100,
    CONSTRAINT [IngestionRule_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Shift_agentId_startsAt_endsAt_idx] ON [dbo].[Shift]([agentId], [startsAt], [endsAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_status_dueAt_receivedAt_idx] ON [dbo].[Ticket]([status], [dueAt], [receivedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Assignment_ticketId_idx] ON [dbo].[Assignment]([ticketId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Assignment_agentId_unassignedAt_idx] ON [dbo].[Assignment]([agentId], [unassignedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_ticketId_at_idx] ON [dbo].[AuditLog]([ticketId], [at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [IngestionRule_mailboxId_ruleOrder_idx] ON [dbo].[IngestionRule]([mailboxId], [ruleOrder]);

-- AddForeignKey
ALTER TABLE [dbo].[Shift] ADD CONSTRAINT [Shift_agentId_fkey] FOREIGN KEY ([agentId]) REFERENCES [dbo].[Agent]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_currentAssigneeId_fkey] FOREIGN KEY ([currentAssigneeId]) REFERENCES [dbo].[Agent]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Assignment] ADD CONSTRAINT [Assignment_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Assignment] ADD CONSTRAINT [Assignment_agentId_fkey] FOREIGN KEY ([agentId]) REFERENCES [dbo].[Agent]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[IngestionRule] ADD CONSTRAINT [IngestionRule_mailboxId_fkey] FOREIGN KEY ([mailboxId]) REFERENCES [dbo].[MailboxConfig]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

