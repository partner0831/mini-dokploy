import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "signin" | "signup";

export function AuthPanel() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({ name, email, password });
        if (result.error) throw new Error(result.error.message);
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message);
      }
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (isPending) {
    return <div className="card muted">Checking session...</div>;
  }

  if (session?.user) {
    return (
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>{session.user.name}</strong>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            {session.user.email}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={() => authClient.signOut()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form className="card grid" onSubmit={handleSubmit}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{mode === "signin" ? "Sign in" : "Create account"}</h2>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Need an account?" : "Have an account?"}
        </button>
      </div>

      {mode === "signup" && (
        <div>
          <label htmlFor="auth-name">Name</label>
          <input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      )}

      <div>
        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>

      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Working..." : mode === "signin" ? "Sign in" : "Sign up"}
      </button>
    </form>
  );
}
