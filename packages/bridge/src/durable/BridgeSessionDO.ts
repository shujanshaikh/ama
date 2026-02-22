import type { WorkerBindings } from "@/env";

type SocketRole = "agent" | "cli" | "frontend";

type SocketAttachment = {
  role: SocketRole;
  userId: string;
  connectedAt: number;
};

type PendingFrontendRpc = {
  ws: WebSocket;
  timeout: ReturnType<typeof setTimeout>;
};

type PendingAgentCall = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

function toText(message: ArrayBuffer | string): string {
  if (typeof message === "string") return message;
  return new TextDecoder().decode(message);
}

export class BridgeSessionDO implements DurableObject {
  private readonly state: DurableObjectState;
  private readonly pendingFrontendRpc = new Map<string, PendingFrontendRpc>();
  private readonly pendingAgentCalls = new Map<string, PendingAgentCall>();

  constructor(state: DurableObjectState, env: WorkerBindings) {
    this.state = state;
    void env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/connect") {
      return this.handleConnect(request);
    }

    if (url.pathname === "/internal/agent-status") {
      return Response.json({ connected: this.getAgentSocket() !== null });
    }

    if (url.pathname === "/internal/dispatch-agent") {
      return this.handleDispatchAgent(request);
    }

    return new Response("Not found", { status: 404 });
  }

  webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): void | Promise<void> {
    const attachment = this.getAttachment(ws);
    if (!attachment) return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(toText(message)) as Record<string, unknown>;
    } catch {
      return;
    }

    if (attachment.role === "agent") {
      this.handleAgentMessage(parsed);
      return;
    }

    if (attachment.role === "frontend") {
      this.handleFrontendMessage(attachment.userId, ws, parsed);
      return;
    }

    this.handleCliMessage(attachment.userId, parsed);
  }

  webSocketClose(ws: WebSocket): void | Promise<void> {
    const attachment = this.getAttachment(ws);
    if (!attachment) return;

    if (attachment.role === "cli") {
      this.broadcastToFrontends(attachment.userId, {
        _tag: "cli_status",
        status: "disconnected",
        timestamp: Date.now(),
      });

      const prefix = `${attachment.userId}:`;
      for (const [key, pending] of this.pendingFrontendRpc) {
        if (!key.startsWith(prefix)) continue;
        clearTimeout(pending.timeout);
        this.safeSend(pending.ws, {
          _tag: "rpc_error",
          requestId: key.slice(prefix.length),
          type: "no_cli_connected",
          message: "CLI disconnected",
        });
        this.pendingFrontendRpc.delete(key);
      }
      return;
    }

    if (attachment.role === "agent") {
      for (const [key, pending] of this.pendingAgentCalls) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("CLI agent disconnected"));
        this.pendingAgentCalls.delete(key);
      }
      return;
    }

    for (const [key, pending] of this.pendingFrontendRpc) {
      if (pending.ws !== ws) continue;
      clearTimeout(pending.timeout);
      this.pendingFrontendRpc.delete(key);
    }
  }

  webSocketError(_ws: WebSocket, _error: unknown): void | Promise<void> {}

  private async handleConnect(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const role = request.headers.get("x-bridge-role") as SocketRole | null;
    const userId = request.headers.get("x-bridge-user-id");
    if (!role || !userId || !["agent", "cli", "frontend"].includes(role)) {
      return new Response("Invalid websocket role", { status: 400 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.state.acceptWebSocket(server);
    server.serializeAttachment({ role, userId, connectedAt: Date.now() } satisfies SocketAttachment);

    if (role === "cli") {
      this.broadcastToFrontends(userId, {
        _tag: "cli_status",
        status: "connected",
        timestamp: Date.now(),
      });
    }

    if (role === "frontend") {
      this.safeSend(server, {
        _tag: "cli_status",
        status: this.getCliSocket(userId) ? "connected" : "disconnected",
        timestamp: Date.now(),
      });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleDispatchAgent(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = (await request.json()) as {
      message?: Record<string, unknown>;
      timeoutMs?: number;
    };

    const payload = body.message;
    if (!payload || typeof payload !== "object") {
      return Response.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const callId = String(payload.id ?? "");
    if (!callId) {
      return Response.json({ ok: false, error: "Message id is required" }, { status: 400 });
    }

    const agentSocket = this.getAgentSocket();
    if (!agentSocket) {
      return Response.json(
        { ok: false, error: "run `amai` to make agent access the local files." },
        { status: 503 },
      );
    }

    this.safeSend(agentSocket, payload);

    const timeoutMs = Number(body.timeoutMs ?? 60000);

    try {
      const result = await new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingAgentCalls.delete(callId);
          reject(new Error("RPC call timed out"));
        }, timeoutMs);

        this.pendingAgentCalls.set(callId, { resolve, reject, timeout });
      });

      return Response.json({ ok: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ ok: false, error: message }, { status: 504 });
    }
  }

  private handleAgentMessage(message: Record<string, unknown>): void {
    if (message.type !== "tool_result") return;

    const callId = String(message.callId ?? message.id ?? "");
    if (!callId) return;

    const pending = this.pendingAgentCalls.get(callId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingAgentCalls.delete(callId);

    if (message.error) {
      pending.reject(new Error(String(message.error)));
      return;
    }

    pending.resolve(message.result);
  }

  private handleFrontendMessage(userId: string, ws: WebSocket, message: Record<string, unknown>): void {
    if (message._tag === "cli_status_request") {
      this.safeSend(ws, {
        _tag: "cli_status_response",
        connected: this.getCliSocket(userId) !== null,
      });
      return;
    }

    if (message._tag !== "rpc_call") return;

    const requestId = String(message.requestId ?? "");
    const cliSocket = this.getCliSocket(userId);

    if (!cliSocket) {
      this.safeSend(ws, {
        _tag: "rpc_error",
        requestId,
        type: "no_cli_connected",
        message: "No CLI connected to handle this request",
      });
      return;
    }

    const key = `${userId}:${requestId}`;
    const timeout = setTimeout(() => {
      this.pendingFrontendRpc.delete(key);
      this.safeSend(ws, {
        _tag: "rpc_error",
        requestId,
        type: "timeout",
        message: "RPC call timed out after 30 seconds",
      });
    }, 30000);

    this.pendingFrontendRpc.set(key, { ws, timeout });
    this.safeSend(cliSocket, { ...message, requestId });
  }

  private handleCliMessage(userId: string, message: Record<string, unknown>): void {
    if (message._tag !== "rpc_result") return;

    const requestId = String(message.requestId ?? "");
    const key = `${userId}:${requestId}`;
    const pending = this.pendingFrontendRpc.get(key);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingFrontendRpc.delete(key);
    this.safeSend(pending.ws, message);
  }

  private broadcastToFrontends(userId: string, payload: Record<string, unknown>): void {
    for (const ws of this.getSocketsByRole("frontend")) {
      const attachment = this.getAttachment(ws);
      if (!attachment || attachment.userId !== userId) continue;
      this.safeSend(ws, payload);
    }
  }

  private getAgentSocket(): WebSocket | null {
    const sockets = this.getSocketsByRole("agent");
    return sockets.at(-1) ?? null;
  }

  private getCliSocket(userId: string): WebSocket | null {
    const sockets = this.getSocketsByRole("cli");
    for (let i = sockets.length - 1; i >= 0; i -= 1) {
      const ws = sockets[i];
      if (!ws) continue;
      const attachment = this.getAttachment(ws);
      if (attachment?.userId === userId) {
        return ws;
      }
    }
    return null;
  }

  private getSocketsByRole(role: SocketRole): WebSocket[] {
    return this.state.getWebSockets().filter((ws) => this.getAttachment(ws)?.role === role);
  }

  private getAttachment(ws: WebSocket): SocketAttachment | null {
    try {
      const attachment = ws.deserializeAttachment();
      if (!attachment || typeof attachment !== "object") return null;
      const casted = attachment as SocketAttachment;
      if (!casted.userId || !casted.role) return null;
      return casted;
    } catch {
      return null;
    }
  }

  private safeSend(ws: WebSocket, payload: unknown): void {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // no-op
    }
  }
}
