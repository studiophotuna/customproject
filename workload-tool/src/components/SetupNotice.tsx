/**
 * Shown when the app is deployed but not configured.
 *
 * Rendered on the server, because React scrubs error messages out of client
 * error boundaries in production builds — the actionable text would be lost if
 * this were handled by error.tsx.
 */
export function SetupNotice({ detail }: { detail: string }) {
  return (
    <div className="signin-wrap">
      <div className="signin">
        <div className="brand" style={{ padding: "0 0 6px", fontSize: 26 }}>
          Workload<span>Flow</span>
        </div>
        <h1 style={{ fontSize: 19, margin: "6px 0 4px" }}>
          Almost there — one setting is missing
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          The application deployed successfully. It just needs its environment
          configured before it can serve pages.
        </p>

        <div className="notice bad" style={{ margin: "16px 0" }}>
          {detail}
        </div>

        <div className="panel">
          <h3 style={{ fontSize: 13, margin: "0 0 10px" }}>
            Set these in Vercel → Settings → Environment Variables
          </h3>
          <div className="rule">
            <span>
              <code>AUTH_MODE</code>
            </span>
            <b>demo</b>
          </div>
          <div className="rule">
            <span>
              <code>DATABASE_URL</code>
            </span>
            <b>Supabase session pooler, port 5432</b>
          </div>
          <div className="rule">
            <span>
              <code>DIRECT_URL</code>
            </span>
            <b>the same value</b>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 0 }}>
            Use the <b>Session pooler</b> connection string (port 5432), not the
            transaction pooler (6543) — this app relies on interactive
            transactions to keep a ticket change and its audit row atomic.
            Redeploy after saving.
          </p>
        </div>
      </div>
    </div>
  );
}
