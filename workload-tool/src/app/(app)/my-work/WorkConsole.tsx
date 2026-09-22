"use client";

import { useActionState, useState } from "react";

import { LiveTimer } from "@/components/LiveTimer";
import { StatusBadge } from "@/components/ui";
import { ACTIVITY_LABELS, SELECTABLE_KINDS, type ActivityKind } from "@/lib/domain/work";
import {
  activityAction,
  nextTicketAction,
  pendAction,
  resolveAction,
  startWorkAction,
  stopWorkAction,
  type ConsoleState,
} from "@/app/(app)/my-work/actions";

export interface ConsoleTicket {
  id: string;
  subject: string;
  ticketType: string;
  status: string;
  body: string | null;
  dueAt: string;
  receivedAt: string;
  handleSeconds: number;
}

export interface ConsoleProps {
  clockedIn: boolean;
  sessionStartedAt: string | null;
  activityKind: ActivityKind | null;
  activityStartedAt: string | null;
  ticket: ConsoleTicket | null;
  canBeAssigned: boolean;
}

/** Plain button wired to a no-argument server action. */
function ActionButton({
  action,
  children,
  className = "btn",
  disabled,
}: {
  action: () => Promise<ConsoleState>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ConsoleState, FormData>(
    async () => action(),
    {}
  );
  return (
    <>
      <form action={formAction} style={{ display: "inline" }}>
        <button className={className} disabled={pending || disabled}>
          {pending ? "Working…" : children}
        </button>
      </form>
      {state.error && (
        <div className="err" style={{ marginTop: 10 }}>
          {state.error}
        </div>
      )}
    </>
  );
}

export function WorkConsole(props: ConsoleProps) {
  const [pendOpen, setPendOpen] = useState(false);
  const [pendState, pendFormAction, pendPending] = useActionState<ConsoleState, FormData>(
    pendAction,
    {}
  );
  const [activityState, activityFormAction] = useActionState<ConsoleState, FormData>(
    activityAction,
    {}
  );

  if (!props.clockedIn) {
    return (
      <div className="console">
        <div className="statusline">
          <span className="dot idle" />
          <b>Not working</b>
        </div>
        <p style={{ color: "var(--muted)", maxWidth: 560 }}>
          Press start and the system assigns your first ticket immediately —
          the one with the nearest SLA deadline, arrival order breaking ties.
          You do not choose what to work on.
        </p>
        {!props.canBeAssigned && (
          <div className="err" style={{ marginBottom: 12 }}>
            Your account has no active agent record, so tickets cannot be
            assigned to you. An admin needs to create one.
          </div>
        )}
        <ActionButton
          action={startWorkAction}
          className="btn primary big"
          disabled={!props.canBeAssigned}
        >
          Start working
        </ActionButton>
      </div>
    );
  }

  const onTicket = props.activityKind === "TICKET" && props.ticket !== null;

  return (
    <div className={`console ${onTicket ? "working" : ""}`}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="statusline">
            <span
              className={`dot ${
                props.activityKind === "BREAK"
                  ? "break"
                  : onTicket
                    ? ""
                    : "idle"
              }`}
            />
            <b>
              {props.activityKind
                ? ACTIVITY_LABELS[props.activityKind]
                : "Clocked in"}
            </b>
            {props.sessionStartedAt && (
              <span style={{ color: "var(--muted)", fontSize: 12 }}>
                session started{" "}
                {new Date(props.sessionStartedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          {props.activityStartedAt && (
            <LiveTimer
              startedAt={props.activityStartedAt}
              className="bigtimer"
            />
          )}
        </div>

        <div className="actions" style={{ alignItems: "flex-start" }}>
          <ActionButton action={stopWorkAction}>Stop working</ActionButton>
        </div>
      </div>

      {onTicket && props.ticket ? (
        <div className="section">
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <StatusBadge status={props.ticket.status} />
            <span style={{ color: "var(--muted)", fontSize: 12 }}>
              {props.ticket.ticketType} · due{" "}
              {new Date(props.ticket.dueAt).toLocaleString()}
            </span>
          </div>
          <h2 style={{ margin: "8px 0 4px", fontSize: 19 }}>
            {props.ticket.subject}
          </h2>
          {props.ticket.body && (
            <p style={{ color: "#41505f", marginTop: 6 }}>{props.ticket.body}</p>
          )}

          <div className="actions" style={{ marginTop: 16 }}>
            <ActionButton action={resolveAction} className="btn primary">
              Mark resolved
            </ActionButton>
            <button
              className="btn"
              type="button"
              onClick={() => setPendOpen((v) => !v)}
            >
              {pendOpen ? "Cancel" : "Mark pending"}
            </button>
          </div>

          {pendOpen && (
            <form action={pendFormAction} style={{ marginTop: 14, maxWidth: 560 }}>
              <div className="field">
                <label htmlFor="reason">
                  Why is this pending? (required — free text for now, a picklist
                  of common reasons later)
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  required
                  maxLength={400}
                  placeholder="e.g. Waiting on rate confirmation from the carrier"
                />
              </div>
              {pendState.error && (
                <div className="err" style={{ marginTop: 8 }}>
                  {pendState.error}
                </div>
              )}
              <button className="btn primary" style={{ marginTop: 10 }} disabled={pendPending}>
                {pendPending ? "Saving…" : "Set pending and take next ticket"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="section">
          <div className="notice">
            No ticket is running. Take the next one from the queue, or keep your
            current status while you are away from ticket work.
          </div>
          <div className="actions" style={{ marginTop: 12 }}>
            <ActionButton action={nextTicketAction} className="btn primary">
              Get next ticket
            </ActionButton>
          </div>
        </div>
      )}

      <div className="section">
        <h3>Set your status</h3>
        <div className="chiprow">
          {SELECTABLE_KINDS.map((kind) => (
            <form key={kind} action={activityFormAction} style={{ display: "inline" }}>
              <input type="hidden" name="kind" value={kind} />
              <button
                className={`chip ${props.activityKind === kind ? "on" : ""}`}
                type="submit"
              >
                {ACTIVITY_LABELS[kind]}
              </button>
            </form>
          ))}
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 9 }}>
          Meetings, ad-hoc work and training count towards utilization. Break and
          idle are recorded but do not.
        </p>
        {activityState.error && (
          <div className="err" style={{ marginTop: 8 }}>
            {activityState.error}
          </div>
        )}
      </div>
    </div>
  );
}
