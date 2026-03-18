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
  const ctx = event.context;
  const name = String(ctx.toolName ?? ctx.name ?? ctx.tool ?? '');
  if (!name) return null;

  return {
    name,
    arguments: phase === 'before' ? (ctx.arguments ?? ctx.input) as Record<string, unknown> : undefined,
    result: phase === 'after' ? String(ctx.result ?? ctx.output ?? '') : undefined,
    success: phase === 'after' ? Boolean(ctx.success ?? !ctx.error) : undefined,
    duration_ms: Number(ctx.durationMs ?? 0) || undefined,
  };
}
