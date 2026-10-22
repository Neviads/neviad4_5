import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";

export class AgentApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentApiError";
  }
}

// Set by next.config.ts from the root .env (NEXT_PUBLIC_WS_URL, or ws://localhost:APP_PORT/ws).
const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "";

export function createRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `request-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Display-only preview of the file the model is still writing, published to /topic/agents/simulation/{runId}/draft
 * (the backend's CodeDraftPublisher keeps that name). START begins a new draft, DELTA appends `text`, ABORT drops it.
 * It is unchecked and unsaved; the real file arrives through the live-code bridge.
 */
export type RunDraft = { runId: string; type: "START" | "DELTA" | "ABORT" | "END"; text: string; seq: number; path?: string; tool?: string; title?: string };
export const simulationDraftTopic = (runId: string) => `/topic/agents/simulation/${runId}/draft`;

/** One step of an agent (a tool call, or the run as a whole when tool is "agent"), published to /topic/agents/activity/{runId}. Display only. */
export type AgentActivity = { runId: string; agent: string; title: string; tool: string; phase: "STARTED" | "FINISHED" | "PROGRESS"; success: boolean; message: string; at: number };
export const agentActivityTopic = (runId: string) => `/topic/agents/activity/${runId}`;

type TopicEntry = { destination: string; handler: (body: string) => void; subscription?: StompSubscription };

/** STOMP connection to the backend: keeps topic subscriptions across automatic reconnects. */
export class StompClient {
  private readonly client: Client;
  private connection: Promise<void> | null = null;
  // Long-lived topic subscriptions (live code bridge). stompjs reconnects on its own but forgets subscriptions.
  private readonly topics = new Set<TopicEntry>();
  private readonly stateListeners = new Set<(connected: boolean) => void>();

  constructor() {
    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 3000,
      debug: () => undefined,
    });
    this.client.onWebSocketClose = () => this.notifyConnection(false);
  }

  private notifyConnection(connected: boolean): void {
    this.stateListeners.forEach((listener) => listener(connected));
  }

  private resubscribeTopics(): void {
    for (const topic of this.topics) {
      topic.subscription = this.client.subscribe(topic.destination, (message: IMessage) => topic.handler(message.body));
    }
  }

  connect(): Promise<void> {
    if (this.client.connected) return Promise.resolve();
    if (this.connection) return this.connection;

    this.connection = new Promise<void>((resolve, reject) => {
      const fail = (error: Error) => {
        this.connection = null;
        reject(error);
      };
      this.client.onConnect = () => {
        this.connection = null;
        this.resubscribeTopics(); // also runs after an automatic reconnect
        this.notifyConnection(true);
        resolve();
      };
      this.client.onStompError = (frame) => fail(new AgentApiError(frame.headers.message ?? "Kết nối tới máy chủ thất bại."));
      this.client.onWebSocketError = () => fail(new AgentApiError("Không thể kết nối tới máy chủ. Vui lòng thử lại."));
      this.client.activate();
    });
    return this.connection;
  }

  /** Generic topic subscription (used by the live code bridge). Resolves to an unsubscribe function. */
  async subscribeTopic(destination: string, handler: (body: string) => void): Promise<() => void> {
    await this.connect();
    const topic: TopicEntry = { destination, handler };
    this.topics.add(topic);
    topic.subscription = this.client.subscribe(destination, (message: IMessage) => handler(message.body));
    return () => {
      this.topics.delete(topic);
      try { topic.subscription?.unsubscribe(); } catch { /* the socket is already closed */ }
    };
  }

  /** Reports the live socket state (false while the socket is down or reconnecting). Returns an unsubscribe function. */
  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.stateListeners.add(listener);
    return () => { this.stateListeners.delete(listener); };
  }

  /** Generic application-destination publish. */
  async send(destination: string, body: unknown): Promise<void> {
    await this.connect();
    this.client.publish({ destination, body: JSON.stringify(body) });
  }

  disconnect(): void {
    this.connection = null;
    this.topics.clear();
    this.notifyConnection(false);
    void this.client.deactivate();
  }
}
