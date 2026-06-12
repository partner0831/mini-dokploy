import { useEffect, useRef, useState } from "react";

type Props = {
  deploymentId: string;
  active?: boolean;
};

export function LogViewer({ deploymentId, active }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const boxRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!active) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://${window.location.host}/api/ws/logs?deploymentId=${deploymentId}`,
    );

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "log") {
          setLines((prev) => [...prev.slice(-400), payload.line]);
        }
      } catch {
        // ignore malformed frames
      }
    };

    return () => socket.close();
  }, [deploymentId, active]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  if (!active) return null;

  return (
    <pre ref={boxRef} className="logs">
      {lines.length ? lines.join("\n") : "Waiting for build output..."}
    </pre>
  );
}
