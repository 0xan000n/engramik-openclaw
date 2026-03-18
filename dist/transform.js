"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformMessageReceived = transformMessageReceived;
exports.transformMessageSent = transformMessageSent;
exports.transformLlmInput = transformLlmInput;
exports.transformLlmOutput = transformLlmOutput;
exports.transformToolCall = transformToolCall;
// Helper: read a property from a flat event — OpenClaw events are NOT wrapped in context
function get(event, ...keys) {
    for (const key of keys) {
        // Check top-level first (OpenClaw 2026.3.x sends flat events)
        if (event[key] !== undefined)
            return event[key];
        // Then check context wrapper (future versions might wrap)
        const ctx = event.context;
        if (ctx && ctx[key] !== undefined)
            return ctx[key];
    }
    return undefined;
}
function str(event, ...keys) {
    const v = get(event, ...keys);
    return v != null ? String(v) : '';
}
function num(event, ...keys) {
    const v = get(event, ...keys);
    return Number(v) || 0;
}
function sessionKey(event) {
    return str(event, 'sessionKey', 'sessionId', 'conversationId', 'runId') || 'unknown';
}
function timestamp(event) {
    const ts = get(event, 'timestamp');
    if (ts instanceof Date)
        return ts.getTime();
    if (typeof ts === 'number')
        return ts;
    return Date.now();
}
function transformMessageReceived(event) {
    const e = event;
    const content = str(e, 'content', 'bodyForAgent', 'transcript', 'body', 'text');
    if (!content)
        return null;
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
function transformMessageSent(event) {
    const e = event;
    const content = str(e, 'content', 'body', 'text', 'response');
    if (!content)
        return null;
    const usage = (get(e, 'usage') ?? {});
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
function transformLlmInput(event) {
    const e = event;
    const content = str(e, 'prompt', 'input', 'content', 'bodyForAgent', 'messages', 'text');
    if (!content)
        return null;
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
function transformLlmOutput(event) {
    const e = event;
    const content = str(e, 'response', 'completion', 'output', 'content', 'text');
    if (!content)
        return null;
    const usage = (get(e, 'usage') ?? {});
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
function transformToolCall(event, phase) {
    // OpenClaw sends flat: {toolName, params, runId, toolCallId}
    const e = event;
    const name = str(e, 'toolName', 'name', 'tool');
    if (!name)
        return null;
    const args = (get(e, 'params', 'arguments', 'input', 'args') ?? undefined);
    const result = str(e, 'result', 'output', 'response');
    return {
        name,
        arguments: phase === 'before' ? args : undefined,
        result: phase === 'after' && result ? result : undefined,
        success: phase === 'after' ? !get(e, 'error') : undefined,
        duration_ms: num(e, 'durationMs', 'duration') || undefined,
    };
}
//# sourceMappingURL=transform.js.map