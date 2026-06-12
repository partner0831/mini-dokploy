import type { WebSocket } from "ws";

type Listener = (line: string) => void;

const rooms = new Map<string, Set<Listener>>();

export function subscribe(deploymentId: string, listener: Listener) {
  if (!rooms.has(deploymentId)) {
    rooms.set(deploymentId, new Set());
  }
  rooms.get(deploymentId)!.add(listener);
  return () => rooms.get(deploymentId)?.delete(listener);
}

export function publish(deploymentId: string, line: string) {
  const listeners = rooms.get(deploymentId);
  if (!listeners) return;
  for (const listener of listeners) {
    listener(line);
  }
}

export function attachSocket(deploymentId: string, socket: WebSocket) {
  const send = (line: string) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify({ type: "log", line }));
    }
  };

  const unsubscribe = subscribe(deploymentId, send);
  socket.send(JSON.stringify({ type: "connected", deploymentId }));

  return () => unsubscribe();
}
