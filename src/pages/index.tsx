import { AuthPanel } from "@/components/AuthPanel";
import { DeployForm } from "@/components/DeployForm";
import { DeploymentList } from "@/components/DeploymentList";

const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";

export default function Home() {
  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>Mini-Dokploy</h1>
          <p>Git in, Docker service out — routed through Traefik on a generated subdomain.</p>
        </div>
      </header>

      {authEnabled && <AuthPanel />}

      <div className="grid" style={{ marginTop: "1.25rem" }}>
        <DeployForm />
        <section>
          <h2 style={{ margin: "0 0 0.75rem" }}>Deployments</h2>
          <DeploymentList />
        </section>
      </div>
    </main>
  );
}
