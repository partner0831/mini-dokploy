import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { LogViewer } from "./LogViewer";
import { trpc } from "@/utils/trpc";

const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";

const busyStatuses = new Set(["pending", "building", "deploying"]);

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

export function DeploymentList() {
  const { data: session } = authClient.useSession();
  const blocked = authEnabled && !session?.user;
  const utils = trpc.useUtils();
  const { data, isLoading, isError } = trpc.deployments.list.useQuery(undefined, {
    refetchInterval: 4000,
    enabled: !blocked,
  });

  const redeploy = trpc.deployments.redeploy.useMutation({
    onSuccess: () => utils.deployments.list.invalidate(),
  });

  const remove = trpc.deployments.remove.useMutation({
    onSuccess: () => utils.deployments.list.invalidate(),
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (blocked) {
    return <div className="card muted">Your deployments show up here after you sign in.</div>;
  }

  if (isLoading) {
    return <div className="card muted">Loading deployments...</div>;
  }

  if (isError) {
    return <div className="card muted">Could not load deployments. Try refreshing.</div>;
  }

  if (!data?.length) {
    return (
      <div className="card muted">
        No deployments yet. Ship something — even a tiny static site counts.
      </div>
    );
  }

  return (
    <div className="grid">
      {data.map((dep) => {
        const busy = busyStatuses.has(dep.status);
        const expanded = expandedId === dep.id;

        return (
          <article key={dep.id} className="card grid">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: "0 0 0.35rem" }}>{dep.name}</h3>
                <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                  {dep.repoUrl}
                </p>
              </div>
              <StatusBadge status={dep.status} />
            </div>

            <div className="grid grid-2" style={{ fontSize: "0.9rem" }}>
              <div>
                <span className="muted">URL</span>
                <div>
                  {dep.status === "running" ? (
                    <a href={dep.url} target="_blank" rel="noreferrer">
                      {dep.url}
                    </a>
                  ) : (
                    <span className="muted">{dep.url}</span>
                  )}
                </div>
              </div>
              <div>
                <span className="muted">Port</span>
                <div>{dep.exposedPort}</div>
              </div>
            </div>

            {dep.errorMessage && (
              <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.9rem" }}>{dep.errorMessage}</p>
            )}

            <div className="row-actions">
              <button
                className="btn btn-ghost"
                disabled={busy || redeploy.isPending}
                onClick={() => redeploy.mutate({ id: dep.id })}
              >
                Redeploy
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setExpandedId(expanded ? null : dep.id)}
              >
                {expanded ? "Hide logs" : "Logs"}
              </button>
              <button
                className="btn btn-danger"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`Remove ${dep.name}?`)) {
                    remove.mutate({ id: dep.id });
                  }
                }}
              >
                Remove
              </button>
            </div>

            <LogViewer deploymentId={dep.id} active={expanded || busy} />
          </article>
        );
      })}
    </div>
  );
}
