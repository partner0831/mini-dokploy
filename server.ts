import { createServer } from "http";
import next from "next";
import { parse } from "url";
import { WebSocketServer } from "ws";
import { config } from "./src/server/config";
import { attachSocket } from "./src/server/logs/hub";

// Run migrations on boot
import "./src/server/db/migrate";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname, query } = parse(req.url ?? "", true);

    if (pathname === "/api/ws/logs" && typeof query.deploymentId === "string") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        const cleanup = attachSocket(query.deploymentId as string, ws);
        ws.on("close", cleanup);
      });
      return;
    }

    socket.destroy();
  });

  server.listen(config.port, () => {
    console.log(`Mini-Dokploy listening on :${config.port}`);
    console.log(`Dashboard: ${config.publicUrl}`);
  });
});
