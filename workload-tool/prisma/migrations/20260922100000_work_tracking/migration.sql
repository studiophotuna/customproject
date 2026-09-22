BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Ticket] ADD [startedAt] DATETIME2;

-- CreateTable
CREATE TABLE [dbo].[WorkSession] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [agentId] UNIQUEIDENTIFIER NOT NULL,
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [WorkSession_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [endedAt] DATETIME2,
    CONSTRAINT [WorkSession_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ActivityLog] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [sessionId] UNIQUEIDENTIFIER NOT NULL,
    [kind] NVARCHAR(20) NOT NULL,
    [ticketId] UNIQUEIDENTIFIER,
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [ActivityLog_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [endedAt] DATETIME2,
    [note] NVARCHAR(400),
    CONSTRAINT [ActivityLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AppSetting] (
    [key] NVARCHAR(80) NOT NULL,
    [value] NVARCHAR(400) NOT NULL,
    [label] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(400),
    [updatedAt] DATETIME2 NOT NULL,
    [updatedBy] NVARCHAR(256),
    CONSTRAINT [AppSetting_pkey] PRIMARY KEY CLUSTERED ([key])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkSession_agentId_startedAt_idx] ON [dbo].[WorkSession]([agentId], [startedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [WorkSession_agentId_endedAt_idx] ON [dbo].[WorkSession]([agentId], [endedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLog_sessionId_startedAt_idx] ON [dbo].[ActivityLog]([sessionId], [startedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLog_ticketId_idx] ON [dbo].[ActivityLog]([ticketId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLog_kind_startedAt_idx] ON [dbo].[ActivityLog]([kind], [startedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[WorkSession] ADD CONSTRAINT [WorkSession_agentId_fkey] FOREIGN KEY ([agentId]) REFERENCES [dbo].[Agent]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ActivityLog] ADD CONSTRAINT [ActivityLog_sessionId_fkey] FOREIGN KEY ([sessionId]) REFERENCES [dbo].[WorkSession]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ActivityLog] ADD CONSTRAINT [ActivityLog_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

