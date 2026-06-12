import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";

type LabelRow = { key: string; value: string };

export function DeployForm() {
  const { data: session } = authClient.useSession();
  const blocked = authEnabled && !session?.user;
  const utils = trpc.useUtils();
  const create = trpc.deployments.create.useMutation({
    onSuccess: () => {
      utils.deployments.list.invalidate();
      setName("");
      setRepoUrl("");
      setDockerfilePath("Dockerfile");
      setExposedPort(3000);
      setLabels([]);
    },
  });

  const [name, setName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [dockerfilePath, setDockerfilePath] = useState("Dockerfile");
  const [exposedPort, setExposedPort] = useState(3000);
  const [labels, setLabels] = useState<LabelRow[]>([]);

  function addLabelRow() {
    setLabels((rows) => [...rows, { key: "", value: "" }]);
  }

  function updateLabel(index: number, field: "key" | "value", value: string) {
    setLabels((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function removeLabel(index: number) {
    setLabels((rows) => rows.filter((_, i) => i !== index));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const customLabels = Object.fromEntries(
      labels.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value]),
    );

    create.mutate({
      name,
      repoUrl,
      dockerfilePath,
      exposedPort,
      customLabels: Object.keys(customLabels).length ? customLabels : undefined,
    });
  }

  return (
    <form className="card grid" onSubmit={handleSubmit}>
      <h2 style={{ margin: 0 }}>New deployment</h2>
      <p className="muted" style={{ margin: 0 }}>
        Point at any public Git repo. We clone it, build the image, and spin up a swarm service behind Traefik.
      </p>

      <div className="grid grid-2">
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-app" required />
        </div>
        <div>
          <label htmlFor="port">Exposed port</label>
          <input
            id="port"
            type="number"
            min={1}
            max={65535}
            value={exposedPort}
            onChange={(e) => setExposedPort(Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="repo">Git repo URL</label>
        <input
          id="repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/user/repo.git"
          required
        />
      </div>

      <div>
        <label htmlFor="dockerfile">Dockerfile path</label>
        <input
          id="dockerfile"
          value={dockerfilePath}
          onChange={(e) => setDockerfilePath(e.target.value)}
          placeholder="Dockerfile"
          required
        />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label>Custom Docker labels</label>
          <button type="button" className="btn btn-ghost" onClick={addLabelRow}>
            Add label
          </button>
        </div>
        {labels.length === 0 ? (
          <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
            Optional. Merged on top of the Traefik labels we generate.
          </p>
        ) : (
          <div className="grid" style={{ marginTop: "0.5rem" }}>
            {labels.map((row, index) => (
              <div key={index} className="grid grid-2" style={{ alignItems: "end" }}>
                <input
                  value={row.key}
                  onChange={(e) => updateLabel(index, "key", e.target.value)}
                  placeholder="label.key"
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    value={row.value}
                    onChange={(e) => updateLabel(index, "value", e.target.value)}
                    placeholder="value"
                  />
                  <button type="button" className="btn btn-ghost" onClick={() => removeLabel(index)}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {create.error && <p style={{ color: "var(--danger)", margin: 0 }}>{create.error.message}</p>}

      {blocked && (
        <p className="muted" style={{ margin: 0 }}>
          Sign in above to create a deployment.
        </p>
      )}

      <button className="btn btn-primary" type="submit" disabled={blocked || create.isPending}>
        {create.isPending ? "Starting..." : "Deploy"}
      </button>
    </form>
  );
}
