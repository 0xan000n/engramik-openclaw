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
    const ctx = event.context;
    const name = String(ctx.toolName ?? ctx.name ?? ctx.tool ?? '');
    if (!name)
        return null;
    return {
        name,
        arguments: phase === 'before' ? (ctx.arguments ?? ctx.input) : undefined,
        result: phase === 'after' ? String(ctx.result ?? ctx.output ?? '') : undefined,
        success: phase === 'after' ? Boolean(ctx.success ?? !ctx.error) : undefined,
        duration_ms: Number(ctx.durationMs ?? 0) || undefined,
    };
}
//# sourceMappingURL=transform.js.map