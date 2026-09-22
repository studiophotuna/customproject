-- Database-level enforcement for the string "enum" columns.
-- -----------------------------------------------------------------------------
-- Mirrors prisma/migrations/20260922090100_enum_check_constraints for the
-- Postgres target. The source schema keeps these columns as Strings because the
-- SQL Server connector has no Prisma enums; Postgres could use real enums, but
-- the two targets are kept identical so behaviour does not diverge by backend.
--
-- Every name is schema-qualified. This database is shared with an unrelated
-- application, so nothing here may depend on search_path.
--
-- Keep in step with src/lib/domain/constants.ts. Adding a value means a new
-- migration that drops and recreates the relevant constraint.

ALTER TABLE "workload"."Agent" ADD CONSTRAINT "Agent_role_check"
    CHECK ("role" IN ('ADMIN', 'MANAGER', 'LEADER', 'MEMBER'));

ALTER TABLE "workload"."Ticket" ADD CONSTRAINT "Ticket_source_check"
    CHECK ("source" IN ('EMAIL', 'MANUAL'));

ALTER TABLE "workload"."Ticket" ADD CONSTRAINT "Ticket_status_check"
    CHECK ("status" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'));

ALTER TABLE "workload"."Assignment" ADD CONSTRAINT "Assignment_reason_check"
    CHECK ("reason" IN ('AUTO', 'MANUAL_OVERRIDE', 'HANDOVER', 'REASSIGN'));

ALTER TABLE "workload"."AuditLog" ADD CONSTRAINT "AuditLog_event_check"
    CHECK ("event" IN ('CREATED', 'ASSIGNED', 'REASSIGNED', 'UNASSIGNED', 'STARTED',
                       'HELD', 'RESUMED', 'RESOLVED', 'REOPENED', 'CLOSED', 'OVERRIDE'));

ALTER TABLE "workload"."MailboxConfig" ADD CONSTRAINT "MailboxConfig_platform_check"
    CHECK ("platform" IN ('EXCHANGE_ONPREM', 'M365_GRAPH', 'IMAP'));

ALTER TABLE "workload"."IngestionRule" ADD CONSTRAINT "IngestionRule_matchKind_check"
    CHECK ("matchKind" IN ('SENDER_DOMAIN', 'SUBJECT_KEYWORD', 'TO_ADDRESS'));

-- A ticket ON_HOLD must carry the moment the clock stopped, and a ticket that
-- is not on hold must not. This is the invariant the SLA maths depends on.
ALTER TABLE "workload"."Ticket" ADD CONSTRAINT "Ticket_onHoldSince_check"
    CHECK (("status" = 'ON_HOLD' AND "onHoldSince" IS NOT NULL)
        OR ("status" <> 'ON_HOLD' AND "onHoldSince" IS NULL));
