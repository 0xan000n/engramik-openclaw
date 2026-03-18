import { EngramikClient } from './client.js';
import {
  transformMessageReceived,
  transformMessageSent,
  transformLlmInput,
  transformLlmOutput,
  transformToolCall,
  type ToolCallData,
} from './transform.js';

// Pending tool calls keyed by runId, merged into the next assistant turn
const pendingToolCalls = new Map<string, ToolCallData[]>();

export function createHookHandlers(client: EngramikClient) {
  return {
    onMessageReceived(event: unknown): void {
      try {
        const interaction = transformMessageReceived(event);
        if (interaction) client.send(interaction);
      } catch (err) {
        console.error('[engramik] message:received error:', (err as Error).message);
      }
    },

    onMessageSent(event: unknown): void {
      try {
        const interaction = transformMessageSent(event);
        if (interaction) {
          // Attach any pending tool calls
          const e = event as Record<string, unknown>;
          const key = String(e.sessionKey ?? e.runId ?? e.sessionId ?? '');
          const tools = pendingToolCalls.get(key);
          if (tools && tools.length > 0) {
            interaction.tool_calls = tools;
            pendingToolCalls.delete(key);
          }
          client.send(interaction);
        }
      } catch (err) {
        console.error('[engramik] message:sent error:', (err as Error).message);
      }
    },

    onMessagePreprocessed(event: unknown): void {
      try {
        const e = event as Record<string, unknown>;
        const content = String(e.bodyForAgent ?? e.content ?? e.transcript ?? '');
        if (!content) return;

        client.send({
          agent_source: 'openclaw',
          session_key: String(e.sessionKey ?? e.sessionId ?? e.runId ?? 'unknown'),
          timestamp: Date.now(),
          role: 'user',
          content,
          channel: String(e.channelId ?? e.channel ?? ''),
          metadata: { preprocessed: true },
        });
      } catch (err) {
        console.error('[engramik] message:preprocessed error:', (err as Error).message);
      }
    },

    onLlmInput(event: unknown): void {
      try {
        const interaction = transformLlmInput(event);
        if (interaction) client.send(interaction);
      } catch (err) {
        console.error('[engramik] llm_input error:', (err as Error).message);
      }
    },

    onLlmOutput(event: unknown): void {
      try {
        const interaction = transformLlmOutput(event);
        if (interaction) {
          const e = event as Record<string, unknown>;
          const key = String(e.runId ?? e.sessionKey ?? e.sessionId ?? '');
          const tools = pendingToolCalls.get(key);
          if (tools && tools.length > 0) {
            interaction.tool_calls = tools;
            pendingToolCalls.delete(key);
          }
          client.send(interaction);
        }
      } catch (err) {
        console.error('[engramik] llm_output error:', (err as Error).message);
      }
    },

    onBeforeToolCall(event: unknown): void {
      try {
        const tool = transformToolCall(event, 'before');
        if (!tool) return;

        const e = event as Record<string, unknown>;
        const key = String(e.runId ?? e.sessionKey ?? e.sessionId ?? 'unknown');
        if (!pendingToolCalls.has(key)) pendingToolCalls.set(key, []);
        pendingToolCalls.get(key)!.push(tool);
      } catch (err) {
        console.error('[engramik] before_tool_call error:', (err as Error).message);
      }
    },

    onAfterToolCall(event: unknown): void {
      try {
        const tool = transformToolCall(event, 'after');
        if (!tool) return;

        const e = event as Record<string, unknown>;
        const key = String(e.runId ?? e.sessionKey ?? e.sessionId ?? 'unknown');
        const pending = pendingToolCalls.get(key);
        if (pending) {
          const match = pending.find((t) => t.name === tool.name && !t.result);
          if (match) {
            match.result = tool.result;
            match.success = tool.success;
            match.duration_ms = tool.duration_ms;
          } else {
            pending.push(tool);
          }
        } else {
          pendingToolCalls.set(key, [tool]);
        }
      } catch (err) {
        console.error('[engramik] after_tool_call error:', (err as Error).message);
      }
    },

    onAgentEnd(event: unknown): void {
      try {
        const e = event as Record<string, unknown>;
        const key = String(e.runId ?? e.sessionKey ?? e.sessionId ?? '');
        pendingToolCalls.delete(key);
      } catch {
        // ignore
      }
    },
  };
}
