import { EngramikClient } from './client.js';
export declare function createHookHandlers(client: EngramikClient): {
    onMessageReceived(event: unknown): void;
    onMessageSent(event: unknown): void;
    onMessagePreprocessed(event: unknown): void;
    onLlmInput(event: unknown): void;
    onLlmOutput(event: unknown): void;
    onBeforeToolCall(event: unknown): void;
    onAfterToolCall(event: unknown): void;
    onAgentEnd(event: unknown): void;
};
//# sourceMappingURL=hooks.d.ts.map