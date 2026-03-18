import { EngramikClient } from './client.js';
import {
  transformMessageReceived,
  transformMessageSent,
  transformLlmInput,
  transformLlmOutput,
  transformToolCall,
  type OpenClawHookEvent,
  type ToolCallData,
} from './transform.js';

// Pending tool calls keyed by session, merged into the next assistant turn
const pendingToolCalls = new Map<string, ToolCallData[]>();

export function createHookHandlers(client: EngramikClient) {
  return {
    onMessageReceived(event: OpenClawHookEvent): void {
      const interaction = transformMessageReceived(event);
      if (interaction) {
        client.send(interaction);
      }
    },

    onMessageSent(event: OpenClawHookEvent): void {
      const interaction = transformMessageSent(event);
      if (interaction) {
        // Attach any pending tool calls to this assistant turn
        const key = interaction.session_key;
        const tools = pendingToolCalls.get(key);
        if (tools && tools.length > 0) {
          interaction.tool_calls = tools;
          pendingToolCalls.delete(key);
        }
        client.send(interaction);
      }
    },

    onMessagePreprocessed(event: OpenClawHookEvent): void {
      // Captures the fully enriched message before the agent sees it
      // Useful for seeing what context was assembled (skills, memory, etc.)
      const ctx = event.context;
      const bodyForAgent = String(ctx.bodyForAgent ?? '');
      if (!bodyForAgent) return;

      const sessionKey = event.sessionKey ?? String(ctx.sessionId ?? 'unknown');

      client.send({
        agent_source: 'openclaw',
        session_key: sessionKey,
        timestamp: event.timestamp?.getTime() ?? Date.now(),
        role: 'user',
        content: bodyForAgent,
        channel: String(ctx.channelId ?? ''),
        metadata: {
          preprocessed: true,
          skillsLoaded: ctx.skillsLoaded,
          memoryRecalled: ctx.memoryRecalled,
        },
      });
    },

    onLlmInput(event: OpenClawHookEvent): void {
      const interaction = transformLlmInput(event);
      if (interaction) {
        client.send(interaction);
      }
    },

    onLlmOutput(event: OpenClawHookEvent): void {
      const interaction = transformLlmOutput(event);
      if (interaction) {
        // Attach any pending tool calls
        const key = interaction.session_key;
        const tools = pendingToolCalls.get(key);
        if (tools && tools.length > 0) {
          interaction.tool_calls = tools;
          pendingToolCalls.delete(key);
        }
        client.send(interaction);
      }
    },

    onBeforeToolCall(event: OpenClawHookEvent): void {
      const tool = transformToolCall(event, 'before');
      if (!tool) return;

      const key = event.sessionKey ?? String(event.context.sessionId ?? 'unknown');
      if (!pendingToolCalls.has(key)) {
        pendingToolCalls.set(key, []);
      }
      pendingToolCalls.get(key)!.push(tool);
    },

    onAfterToolCall(event: OpenClawHookEvent): void {
      const tool = transformToolCall(event, 'after');
      if (!tool) return;

      const key = event.sessionKey ?? String(event.context.sessionId ?? 'unknown');
      const pending = pendingToolCalls.get(key);
      if (pending) {
        // Find the matching before-call and merge result info
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
    },

    onAgentEnd(event: OpenClawHookEvent): void {
      // Clean up any remaining pending tool calls for this session
      const key = event.sessionKey ?? String(event.context.sessionId ?? 'unknown');
      pendingToolCalls.delete(key);
    },
  };
}
