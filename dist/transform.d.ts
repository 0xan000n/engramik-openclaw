export interface Interaction {
    agent_source: string;
    session_key: string;
    timestamp: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    channel?: string;
    model?: string;
    provider?: string;
    tokens_in?: number;
    tokens_out?: number;
    cost_usd?: number;
    duration_ms?: number;
    tool_calls?: ToolCallData[];
    metadata?: Record<string, unknown>;
}
export interface ToolCallData {
    name: string;
    arguments?: Record<string, unknown>;
    result?: string;
    success?: boolean;
    duration_ms?: number;
}
export declare function transformMessageReceived(event: unknown): Interaction | null;
export declare function transformMessageSent(event: unknown): Interaction | null;
export declare function transformLlmInput(event: unknown): Interaction | null;
export declare function transformLlmOutput(event: unknown): Interaction | null;
export declare function transformToolCall(event: unknown, phase: 'before' | 'after'): ToolCallData | null;
//# sourceMappingURL=transform.d.ts.map