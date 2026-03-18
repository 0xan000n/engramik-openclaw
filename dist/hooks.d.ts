import { EngramikClient } from './client.js';
import { type OpenClawHookEvent } from './transform.js';
export declare function createHookHandlers(client: EngramikClient): {
    onMessageReceived(event: OpenClawHookEvent): void;
    onMessageSent(event: OpenClawHookEvent): void;
    onMessagePreprocessed(event: OpenClawHookEvent): void;
    onLlmInput(event: OpenClawHookEvent): void;
    onLlmOutput(event: OpenClawHookEvent): void;
    onBeforeToolCall(event: OpenClawHookEvent): void;
    onAfterToolCall(event: OpenClawHookEvent): void;
    onAgentEnd(event: OpenClawHookEvent): void;
};
//# sourceMappingURL=hooks.d.ts.map