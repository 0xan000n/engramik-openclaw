import { EngramikClient } from './client.js';
import { createHookHandlers } from './hooks.js';

// OpenClaw plugin API interface (minimal typing for what we use)
interface OpenClawPluginApi {
  getConfig(): Record<string, unknown>;
  registerHook(event: string, handler: (event: unknown) => void): void;
  on(event: string, handler: (event: unknown) => void): void;
}

export default {
  id: 'engramik',

  register(api: OpenClawPluginApi) {
    const config = api.getConfig();
    const endpoint = String(config.endpoint ?? 'http://localhost:4820');
    const batchIntervalMs = Number(config.batchIntervalMs ?? 2000);

    console.log(`[engramik] Initializing — collector at ${endpoint}`);

    const client = new EngramikClient(endpoint, batchIntervalMs);
    const handlers = createHookHandlers(client);

    // Register hooks using registerHook() (works in all versions)
    try {
      api.registerHook('message:received', handlers.onMessageReceived as (e: unknown) => void);
      api.registerHook('message:sent', handlers.onMessageSent as (e: unknown) => void);
      api.registerHook('message:preprocessed', handlers.onMessagePreprocessed as (e: unknown) => void);
      console.log('[engramik] Registered message hooks via registerHook()');
    } catch {
      console.log('[engramik] registerHook() not available, trying api.on()');
    }

    // Also register via api.on() for Opik-proven hooks (newer versions)
    try {
      api.on('llm_input', handlers.onLlmInput as (e: unknown) => void);
      api.on('llm_output', handlers.onLlmOutput as (e: unknown) => void);
      api.on('before_tool_call', handlers.onBeforeToolCall as (e: unknown) => void);
      api.on('after_tool_call', handlers.onAfterToolCall as (e: unknown) => void);
      api.on('agent_end', handlers.onAgentEnd as (e: unknown) => void);
      console.log('[engramik] Registered LLM/tool hooks via api.on()');
    } catch {
      console.log('[engramik] api.on() hooks not available');
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      client.stop().catch(() => {});
    });

    console.log('[engramik] Plugin ready — capturing sessions');
  },
};
