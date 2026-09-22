-- Database-level enforcement for the string "enum" columns.
-- -----------------------------------------------------------------------------
-- The sqlserver connector has no Prisma enums, so schema.prisma documents the
-- allowed values in comments and the app enforces them (src/lib/domain/constants.ts).
-- These CHECK constraints are the second line of defence: they stop a stray
-- script, a manual UPDATE, or a future bug from writing a value the app cannot
-- interpret.
--
-- Keep in step with src/lib/domain/constants.ts. Adding a value means a new
-- migration that drops and recreates the relevant constraint.

BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[Agent] ADD CONSTRAINT [Agent_role_check]
    CHECK ([role] IN ('ADMIN', 'MANAGER', 'LEADER', 'MEMBER'));

ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_source_check]
    CHECK ([source] IN ('EMAIL', 'MANUAL'));

ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_status_check]
    CHECK ([status] IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'));

ALTER TABLE [dbo].[Assignment] ADD CONSTRAINT [Assignment_reason_check]
    CHECK ([reason] IN ('AUTO', 'MANUAL_OVERRIDE', 'HANDOVER', 'REASSIGN'));

ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_event_check]
    CHECK ([event] IN ('CREATED', 'ASSIGNED', 'REASSIGNED', 'UNASSIGNED', 'STARTED',
                       'HELD', 'RESUMED', 'RESOLVED', 'REOPENED', 'CLOSED', 'OVERRIDE'));

ALTER TABLE [dbo].[MailboxConfig] ADD CONSTRAINT [MailboxConfig_platform_check]
    CHECK ([platform] IN ('EXCHANGE_ONPREM', 'M365_GRAPH', 'IMAP'));

ALTER TABLE [dbo].[IngestionRule] ADD CONSTRAINT [IngestionRule_matchKind_check]
    CHECK ([matchKind] IN ('SENDER_DOMAIN', 'SUBJECT_KEYWORD', 'TO_ADDRESS'));

-- A ticket ON_HOLD must carry the moment the clock stopped, and a ticket that
-- is not on hold must not. This is the invariant the SLA maths depends on.
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_onHoldSince_check]
    CHECK (([status] = 'ON_HOLD' AND [onHoldSince] IS NOT NULL)
        OR ([status] <> 'ON_HOLD' AND [onHoldSince] IS NULL));

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
