"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformMessageReceived = transformMessageReceived;
exports.transformMessageSent = transformMessageSent;
exports.transformLlmOutput = transformLlmOutput;
exports.transformLlmInput = transformLlmInput;
exports.transformToolCall = transformToolCall;
function transformMessageReceived(event) {
    const ctx = event.context;
    const content = String(ctx.content ?? ctx.bodyForAgent ?? ctx.transcript ?? '');
    if (!content)
        return null;
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
function transformMessageSent(event) {
    const ctx = event.context;
    const content = String(ctx.content ?? ctx.body ?? '');
    if (!content)
        return null;
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
function transformLlmOutput(event) {
    const ctx = event.context;
    // LLM output events from Opik-style hooks
    const content = String(ctx.response ?? ctx.completion ?? ctx.output ?? ctx.content ?? '');
    if (!content)
        return null;
    const usage = ctx.usage;
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
function transformLlmInput(event) {
    const ctx = event.context;
    const content = String(ctx.prompt ?? ctx.input ?? ctx.content ?? ctx.bodyForAgent ?? '');
    if (!content)
        return null;
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
function transformToolCall(event, phase) {
    // OpenClaw passes tool info in various shapes depending on version
    // Try the event directly, then context, then nested objects
    const evt = event;
    const ctx = (event.context ?? {});
    const name = String(evt.toolName ?? evt.name ?? evt.tool ??
        ctx.toolName ?? ctx.name ?? ctx.tool ??
        ctx.toolCall?.name ??
        '');
    if (!name)
        return null;
    const args = (evt.arguments ?? evt.input ?? evt.args ??
        ctx.arguments ?? ctx.input ?? ctx.args ??
        ctx.toolCall?.arguments);
    const result = String(evt.result ?? evt.output ??
        ctx.result ?? ctx.output ?? '');
    return {
        name,
        arguments: phase === 'before' ? args : undefined,
        result: phase === 'after' && result ? result : undefined,
        success: phase === 'after' ? Boolean(evt.success ?? ctx.success ?? !(evt.error || ctx.error)) : undefined,
        duration_ms: Number(evt.durationMs ?? ctx.durationMs ?? evt.duration ?? ctx.duration ?? 0) || undefined,
    };
}
//# sourceMappingURL=transform.js.map