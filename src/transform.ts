export interface Interaction {
  agent_source: string;
  session_key: string;
  timestamp: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  channel?: string;
  model?: string;
  provider?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  duration_ms?: number;
  tool_calls?: ToolCallData[];
  metadata?: Record<string, unknown>;
}

export interface ToolCallData {
  name: string;
  arguments?: Record<string, unknown>;
  result?: string;
  success?: boolean;
  duration_ms?: number;
}

// Helper: read a property from a flat event — OpenClaw events are NOT wrapped in context
function get(event: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    // Check top-level first (OpenClaw 2026.3.x sends flat events)
    if (event[key] !== undefined) return event[key];
    // Then check context wrapper (future versions might wrap)
    const ctx = event.context as Record<string, unknown> | undefined;
    if (ctx && ctx[key] !== undefined) return ctx[key];
  }
  return undefined;
}

function str(event: Record<string, unknown>, ...keys: string[]): string {
  const v = get(event, ...keys);
  return v != null ? String(v) : '';
}

function num(event: Record<string, unknown>, ...keys: string[]): number {
  const v = get(event, ...keys);
  return Number(v) || 0;
}

function sessionKey(event: Record<string, unknown>): string {
  return str(event, 'sessionKey', 'sessionId', 'conversationId', 'runId') || 'unknown';
}

function timestamp(event: Record<string, unknown>): number {
  const ts = get(event, 'timestamp');
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  return Date.now();
}

export function transformMessageReceived(event: unknown): Interaction | null {
  const e = event as Record<string, unknown>;
  const content = str(e, 'content', 'bodyForAgent', 'transcript', 'body', 'text');
  if (!content) return null;

  return {
    agent_source: 'openclaw',
    session_key: sessionKey(e),
    timestamp: timestamp(e),
    role: 'user',
    content,
    channel: str(e, 'channelId', 'channel'),
    metadata: {
      from: get(e, 'from'),
      messageId: get(e, 'messageId'),
    },
  };
}

export function transformMessageSent(event: unknown): Interaction | null {
  const e = event as Record<string, unknown>;
  const content = str(e, 'content', 'body', 'text', 'response');
  if (!content) return null;

  const usage = (get(e, 'usage') ?? {}) as Record<string, unknown>;

  return {
    agent_source: 'openclaw',
    session_key: sessionKey(e),
    timestamp: timestamp(e),
    role: 'assistant',
    content,
    channel: str(e, 'channelId', 'channel'),
    model: str(e, 'model'),
    provider: str(e, 'provider'),
    tokens_in: num(e, 'inputTokens', 'tokensIn') || Number(usage.inputTokens ?? usage.input_tokens ?? 0) || undefined,
    tokens_out: num(e, 'outputTokens', 'tokensOut') || Number(usage.outputTokens ?? usage.output_tokens ?? 0) || undefined,
    cost_usd: num(e, 'costUsd', 'cost') || Number(usage.costUsd ?? 0) || undefined,
    duration_ms: num(e, 'durationMs', 'duration', 'latency') || undefined,
    metadata: {
      to: get(e, 'to'),
      messageId: get(e, 'messageId'),
      success: get(e, 'success'),
    },
  };
}

export function transformLlmInput(event: unknown): Interaction | null {
  const e = event as Record<string, unknown>;
  const content = str(e, 'prompt', 'input', 'content', 'bodyForAgent', 'messages', 'text');
  if (!content) return null;

  return {
    agent_source: 'openclaw',
    session_key: sessionKey(e),
    timestamp: timestamp(e),
    role: 'user',
    content,
    channel: str(e, 'channelId', 'channel'),
    model: str(e, 'model'),
  };
}

export function transformLlmOutput(event: unknown): Interaction | null {
  const e = event as Record<string, unknown>;
  const content = str(e, 'response', 'completion', 'output', 'content', 'text');
  if (!content) return null;

  const usage = (get(e, 'usage') ?? {}) as Record<string, unknown>;

  return {
    agent_source: 'openclaw',
    session_key: sessionKey(e),
    timestamp: timestamp(e),
    role: 'assistant',
    content,
    channel: str(e, 'channelId', 'channel'),
    model: str(e, 'model'),
    provider: str(e, 'provider'),
    tokens_in: num(e, 'inputTokens', 'tokensIn') || Number(usage.inputTokens ?? usage.input_tokens ?? 0) || undefined,
    tokens_out: num(e, 'outputTokens', 'tokensOut') || Number(usage.outputTokens ?? usage.output_tokens ?? 0) || undefined,
    cost_usd: num(e, 'costUsd', 'cost') || Number(usage.costUsd ?? 0) || undefined,
    duration_ms: num(e, 'durationMs', 'latency', 'duration') || undefined,
  };
}

export function transformToolCall(event: unknown, phase: 'before' | 'after'): ToolCallData | null {
  // OpenClaw sends flat: {toolName, params, runId, toolCallId}
  const e = event as Record<string, unknown>;
  const name = str(e, 'toolName', 'name', 'tool');
  if (!name) return null;

  const args = (get(e, 'params', 'arguments', 'input', 'args') ?? undefined) as Record<string, unknown> | undefined;
  const result = str(e, 'result', 'output', 'response');

  return {
    name,
    arguments: phase === 'before' ? args : undefined,
    result: phase === 'after' && result ? result : undefined,
    success: phase === 'after' ? !get(e, 'error') : undefined,
    duration_ms: num(e, 'durationMs', 'duration') || undefined,
  };
}
