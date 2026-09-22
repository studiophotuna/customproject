import Link from "next/link";

import { getIdentity } from "@/lib/auth";
import { PageHead, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NoAccessPage(props: {
  searchParams: Promise<{ need?: string }>;
}) {
  const [identity, params] = await Promise.all([getIdentity(), props.searchParams]);

  return (
    <>
      <PageHead
        title="You do not have access to that page"
        description="Your role does not include this area. Nothing went wrong."
      />
      <Panel>
        <div className="kv">
          <div className="k">Your role</div>
          <div className="v">
            <span className="badge normal">{identity?.role ?? "unknown"}</span>
          </div>
          {params.need && (
            <>
              <div className="k">Required</div>
              <div className="v">
                <span className="badge warn">{params.need} or higher</span>
              </div>
            </>
          )}
        </div>
        <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 14 }}>
          In the demo you can switch to another identity from the sidebar to see
          how the app looks for a leader, manager or admin. On the on-prem
          deployment your role comes from your AD group membership.
        </p>
        <Link className="btn primary" href="/my-work" style={{ marginTop: 6, display: "inline-block" }}>
          Back to my work
        </Link>
      </Panel>
    </>
  );
}
