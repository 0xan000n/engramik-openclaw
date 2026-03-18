interface OpenClawPluginApi {
    getConfig(): Record<string, unknown>;
    registerHook(event: string, handler: (event: unknown) => void): void;
    on(event: string, handler: (event: unknown) => void): void;
}
declare const _default: {
    id: string;
    register(api: OpenClawPluginApi): void;
};
export default _default;
//# sourceMappingURL=index.d.ts.map