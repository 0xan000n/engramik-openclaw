"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_js_1 = require("./client.js");
const hooks_js_1 = require("./hooks.js");
exports.default = {
    id: 'engramik',
    register(api, pluginConfig) {
        // Try multiple ways to get config (different OpenClaw versions)
        const config = pluginConfig ??
            (typeof api.getConfig === 'function' ? api.getConfig() : null) ??
            api.config ??
            {};
        // ENGRAMIK_ENDPOINT env var is the most reliable way to configure
        // since api.getConfig() doesn't work in all OpenClaw versions
        const endpoint = String(process.env.ENGRAMIK_ENDPOINT ??
            config.endpoint ??
            'http://localhost:4820');
        const batchIntervalMs = Number(config.batchIntervalMs ?? 2000);
        console.log(`[engramik] Initializing — collector at ${endpoint}`);
        const client = new client_js_1.EngramikClient(endpoint, batchIntervalMs);
        const handlers = (0, hooks_js_1.createHookHandlers)(client);
        // Try registerHook() first (works in most versions)
        if (typeof api.registerHook === 'function') {
            try {
                api.registerHook('message:received', handlers.onMessageReceived);
                api.registerHook('message:sent', handlers.onMessageSent);
                api.registerHook('message:preprocessed', handlers.onMessagePreprocessed);
                console.log('[engramik] Registered message hooks via registerHook()');
            }
            catch (err) {
                console.log('[engramik] registerHook() failed:', err.message);
            }
        }
        // Try api.on() for Opik-proven hooks
        if (typeof api.on === 'function') {
            try {
                api.on('llm_input', handlers.onLlmInput);
                api.on('llm_output', handlers.onLlmOutput);
                api.on('before_tool_call', handlers.onBeforeToolCall);
                api.on('after_tool_call', handlers.onAfterToolCall);
                api.on('agent_end', handlers.onAgentEnd);
                console.log('[engramik] Registered LLM/tool hooks via api.on()');
            }
            catch (err) {
                console.log('[engramik] api.on() failed:', err.message);
            }
        }
        // Graceful shutdown
        process.on('SIGTERM', () => {
            client.stop().catch(() => { });
        });
        console.log('[engramik] Plugin ready — capturing sessions');
    },
};
//# sourceMappingURL=index.js.map