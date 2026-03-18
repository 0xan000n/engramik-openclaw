"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHookHandlers = createHookHandlers;
const transform_js_1 = require("./transform.js");
// Pending tool calls keyed by runId, merged into the next assistant turn
const pendingToolCalls = new Map();
function createHookHandlers(client) {
    return {
        onMessageReceived(event) {
            try {
                const interaction = (0, transform_js_1.transformMessageReceived)(event);
                if (interaction)
                    client.send(interaction);
            }
            catch (err) {
                console.error('[engramik] message:received error:', err.message);
            }
        },
        onMessageSent(event) {
            try {
                const interaction = (0, transform_js_1.transformMessageSent)(event);
                if (interaction) {
                    // Attach any pending tool calls
                    const e = event;
                    const key = String(e.sessionKey ?? e.runId ?? e.sessionId ?? '');
                    const tools = pendingToolCalls.get(key);
                    if (tools && tools.length > 0) {
                        interaction.tool_calls = tools;
                        pendingToolCalls.delete(key);
                    }
                    client.send(interaction);
                }
            }
            catch (err) {
                console.error('[engramik] message:sent error:', err.message);
            }
        },
        onMessagePreprocessed(event) {
            try {
                const e = event;
                const content = String(e.bodyForAgent ?? e.content ?? e.transcript ?? '');
                if (!content)
                    return;
                client.send({
                    agent_source: 'openclaw',
                    session_key: String(e.sessionKey ?? e.sessionId ?? e.runId ?? 'unknown'),
                    timestamp: Date.now(),
                    role: 'user',
                    content,
                    channel: String(e.channelId ?? e.channel ?? ''),
                    metadata: { preprocessed: true },
                });
            }
            catch (err) {
                console.error('[engramik] message:preprocessed error:', err.message);
            }
        },
        onLlmInput(event) {
            try {
                const interaction = (0, transform_js_1.transformLlmInput)(event);
                if (interaction)
                    client.send(interaction);
            }
            catch (err) {
                console.error('[engramik] llm_input error:', err.message);
            }
        },
        onLlmOutput(event) {
            try {
                const interaction = (0, transform_js_1.transformLlmOutput)(event);
                if (interaction) {
                    const e = event;
                    const key = String(e.runId ?? e.sessionKey ?? e.sessionId ?? '');
                    const tools = pendingToolCalls.get(key);
                    if (tools && tools.length > 0) {
                        interaction.tool_calls = tools;
                        pendingToolCalls.delete(key);
                    }
                    client.send(interaction);
                }
            }
            catch (err) {
                console.error('[engramik] llm_output error:', err.message);
            }
        },
        onBeforeToolCall(event) {
            try {
                const tool = (0, transform_js_1.transformToolCall)(event, 'before');
                if (!tool)
                    return;
                const e = event;
                const key = String(e.runId ?? e.sessionKey ?? e.sessionId ?? 'unknown');
                if (!pendingToolCalls.has(key))
                    pendingToolCalls.set(key, []);
                pendingToolCalls.get(key).push(tool);
            }
            catch (err) {
                console.error('[engramik] before_tool_call error:', err.message);
            }
        },
        onAfterToolCall(event) {
            try {
                const tool = (0, transform_js_1.transformToolCall)(event, 'after');
                if (!tool)
                    return;
                const e = event;
                const key = String(e.runId ?? e.sessionKey ?? e.sessionId ?? 'unknown');
                const pending = pendingToolCalls.get(key);
                if (pending) {
                    const match = pending.find((t) => t.name === tool.name && !t.result);
                    if (match) {
                        match.result = tool.result;
                        match.success = tool.success;
                        match.duration_ms = tool.duration_ms;
                    }
                    else {
                        pending.push(tool);
                    }
                }
                else {
                    pendingToolCalls.set(key, [tool]);
                }
            }
            catch (err) {
                console.error('[engramik] after_tool_call error:', err.message);
            }
        },
        onAgentEnd(event) {
            try {
                const e = event;
                const key = String(e.runId ?? e.sessionKey ?? e.sessionId ?? '');
                pendingToolCalls.delete(key);
            }
            catch {
                // ignore
            }
        },
    };
}
//# sourceMappingURL=hooks.js.map