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

// OpenClaw hook event shape (based on docs + Opik reference)
export interface OpenClawHookEvent {
  type: string;
  action: string;
  sessionKey?: string;
  timestamp?: Date;
  messages?: string[];
  context: Record<string, unknown>;
}

export function transformMessageReceived(event: OpenClawHookEvent): Interaction | null {
  const ctx = event.context;
  const content = String(ctx.content ?? ctx.bodyForAgent ?? ctx.transcript ?? '');
  if (!content) return null;

  return {
    agent_source: 'openclaw',
    session_key: event.sessionKey ?? String(ctx.sessionId ?? ctx.conversationId ?? 'unknown'),
    timestamp: event.timestamp?.getTime() ?? Date.now(),
    role: 'user',
    content,
    channel: String(ctx.channelId ?? ctx.channel ?? ''),
    metadata: {
      from: ctx.from,
      messageId: ctx.messageId,
      isGroup: ctx.isGroup,
    },
  };
}

export function transformMessageSent(event: OpenClawHookEvent): Interaction | null {
  const ctx = event.context;
  const content = String(ctx.content ?? ctx.body ?? '');
  if (!content) return null;

  return {
    agent_source: 'openclaw',
    session_key: event.sessionKey ?? String(ctx.sessionId ?? ctx.conversationId ?? 'unknown'),
    timestamp: event.timestamp?.getTime() ?? Date.now(),
    role: 'assistant',
    content,
    channel: String(ctx.channelId ?? ctx.channel ?? ''),
    model: String(ctx.model ?? ''),
    provider: String(ctx.provider ?? ''),
    tokens_in: Number(ctx.inputTokens ?? ctx.tokensIn ?? 0) || undefined,
    tokens_out: Number(ctx.outputTokens ?? ctx.tokensOut ?? 0) || undefined,
    cost_usd: Number(ctx.costUsd ?? ctx.cost ?? 0) || undefined,
    duration_ms: Number(ctx.durationMs ?? ctx.duration ?? 0) || undefined,
    metadata: {
      to: ctx.to,
      messageId: ctx.messageId,
      success: ctx.success,
    },
  };
}

export function transformLlmOutput(event: OpenClawHookEvent): Interaction | null {
  const ctx = event.context;

  // LLM output events from Opik-style hooks
  const content = String(
    ctx.response ?? ctx.completion ?? ctx.output ?? ctx.content ?? '',
  );
  if (!content) return null;

  const usage = ctx.usage as Record<string, unknown> | undefined;

  return {
    agent_source: 'openclaw',
    session_key: event.sessionKey ?? String(ctx.sessionId ?? ctx.conversationId ?? 'unknown'),
    timestamp: event.timestamp?.getTime() ?? Date.now(),
    role: 'assistant',
    content,
    channel: String(ctx.channelId ?? ctx.channel ?? ''),
    model: String(ctx.model ?? ''),
    provider: String(ctx.provider ?? ''),
    tokens_in: Number(usage?.inputTokens ?? usage?.input_tokens ?? ctx.inputTokens ?? 0) || undefined,
    tokens_out: Number(usage?.outputTokens ?? usage?.output_tokens ?? ctx.outputTokens ?? 0) || undefined,
    cost_usd: Number(usage?.costUsd ?? ctx.costUsd ?? 0) || undefined,
    duration_ms: Number(ctx.durationMs ?? ctx.latency ?? 0) || undefined,
  };
}

export function transformLlmInput(event: OpenClawHookEvent): Interaction | null {
  const ctx = event.context;

  const content = String(
    ctx.prompt ?? ctx.input ?? ctx.content ?? ctx.bodyForAgent ?? '',
  );
  if (!content) return null;

  return {
    agent_source: 'openclaw',
    session_key: event.sessionKey ?? String(ctx.sessionId ?? ctx.conversationId ?? 'unknown'),
    timestamp: event.timestamp?.getTime() ?? Date.now(),
    role: 'user',
    content,
    channel: String(ctx.channelId ?? ctx.channel ?? ''),
    model: String(ctx.model ?? ''),
  };
}

export function transformToolCall(
  event: OpenClawHookEvent,
  phase: 'before' | 'after',
): ToolCallData | null {
  // OpenClaw passes tool info in various shapes depending on version
  // Try the event directly, then context, then nested objects
  const evt = event as unknown as Record<string, unknown>;
  const ctx = (event.context ?? {}) as Record<string, unknown>;

  const name = String(
    evt.toolName ?? evt.name ?? evt.tool ??
    ctx.toolName ?? ctx.name ?? ctx.tool ??
    (ctx.toolCall as Record<string, unknown>)?.name ??
    '',
  );
  if (!name) return null;

  const args = (
    evt.arguments ?? evt.input ?? evt.args ??
    ctx.arguments ?? ctx.input ?? ctx.args ??
    (ctx.toolCall as Record<string, unknown>)?.arguments
  ) as Record<string, unknown> | undefined;

  const result = String(
    evt.result ?? evt.output ??
    ctx.result ?? ctx.output ?? '',
  );

  return {
    name,
    arguments: phase === 'before' ? args : undefined,
    result: phase === 'after' && result ? result : undefined,
    success: phase === 'after' ? Boolean(evt.success ?? ctx.success ?? !(evt.error || ctx.error)) : undefined,
    duration_ms: Number(evt.durationMs ?? ctx.durationMs ?? evt.duration ?? ctx.duration ?? 0) || undefined,
  };
}
