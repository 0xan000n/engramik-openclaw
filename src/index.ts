import { EngramikClient } from './client.js';
import { createHookHandlers } from './hooks.js';

// OpenClaw plugin API interface — flexible to handle different versions
interface OpenClawPluginApi {
  getConfig?: () => Record<string, unknown>;
  config?: Record<string, unknown>;
  registerHook?: (event: string, handler: (event: unknown) => void) => void;
  on?: (event: string, handler: (event: unknown) => void) => void;
}

export default {
  id: 'engramik',

  register(api: OpenClawPluginApi, pluginConfig?: Record<string, unknown>) {
    // Try multiple ways to get config (different OpenClaw versions)
    const config =
      pluginConfig ??
      (typeof api.getConfig === 'function' ? api.getConfig() : null) ??
      api.config ??
      {};

    const endpoint = String(
      config.endpoint ??
      process.env.ENGRAMIK_ENDPOINT ??
      'http://localhost:4820',
    );
    const batchIntervalMs = Number(config.batchIntervalMs ?? 2000);

    console.log(`[engramik] Initializing — collector at ${endpoint}`);

    const client = new EngramikClient(endpoint, batchIntervalMs);
    const handlers = createHookHandlers(client);

    // Try registerHook() first (works in most versions)
    if (typeof api.registerHook === 'function') {
      try {
        api.registerHook('message:received', handlers.onMessageReceived as (e: unknown) => void);
        api.registerHook('message:sent', handlers.onMessageSent as (e: unknown) => void);
        api.registerHook('message:preprocessed', handlers.onMessagePreprocessed as (e: unknown) => void);
        console.log('[engramik] Registered message hooks via registerHook()');
      } catch (err) {
        console.log('[engramik] registerHook() failed:', (err as Error).message);
      }
    }

    // Try api.on() for Opik-proven hooks
    if (typeof api.on === 'function') {
      try {
        api.on('llm_input', handlers.onLlmInput as (e: unknown) => void);
        api.on('llm_output', handlers.onLlmOutput as (e: unknown) => void);
        api.on('before_tool_call', handlers.onBeforeToolCall as (e: unknown) => void);
        api.on('after_tool_call', handlers.onAfterToolCall as (e: unknown) => void);
        api.on('agent_end', handlers.onAgentEnd as (e: unknown) => void);
        console.log('[engramik] Registered LLM/tool hooks via api.on()');
      } catch (err) {
        console.log('[engramik] api.on() failed:', (err as Error).message);
      }
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      client.stop().catch(() => {});
    });

    console.log('[engramik] Plugin ready — capturing sessions');
  },
};
