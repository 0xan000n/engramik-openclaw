"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_js_1 = require("./client.js");
const hooks_js_1 = require("./hooks.js");
exports.default = {
    id: 'engramik',
    register(api) {
        const config = api.getConfig();
        const endpoint = String(config.endpoint ?? 'http://localhost:4820');
        const batchIntervalMs = Number(config.batchIntervalMs ?? 2000);
        console.log(`[engramik] Initializing — collector at ${endpoint}`);
        const client = new client_js_1.EngramikClient(endpoint, batchIntervalMs);
        const handlers = (0, hooks_js_1.createHookHandlers)(client);
        // Register hooks using registerHook() (works in all versions)
        try {
            api.registerHook('message:received', handlers.onMessageReceived);
            api.registerHook('message:sent', handlers.onMessageSent);
            api.registerHook('message:preprocessed', handlers.onMessagePreprocessed);
            console.log('[engramik] Registered message hooks via registerHook()');
        }
        catch {
            console.log('[engramik] registerHook() not available, trying api.on()');
        }
        // Also register via api.on() for Opik-proven hooks (newer versions)
        try {
            api.on('llm_input', handlers.onLlmInput);
            api.on('llm_output', handlers.onLlmOutput);
            api.on('before_tool_call', handlers.onBeforeToolCall);
            api.on('after_tool_call', handlers.onAfterToolCall);
            api.on('agent_end', handlers.onAgentEnd);
            console.log('[engramik] Registered LLM/tool hooks via api.on()');
        }
        catch {
            console.log('[engramik] api.on() hooks not available');
        }
        // Graceful shutdown
        process.on('SIGTERM', () => {
            client.stop().catch(() => { });
        });
        console.log('[engramik] Plugin ready — capturing sessions');
    },
};
//# sourceMappingURL=index.js.map