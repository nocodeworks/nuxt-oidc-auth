interface ResolveCallbackRedirectUrlOptions {
    configuredCallbackRedirectUrl?: string;
    hasConfiguredCallbackRedirectUrl: boolean;
    sessionCallbackRedirectUrl?: string;
}
export declare function sanitizeCallbackRedirectUrl(value: unknown): string | undefined;
export declare function resolveCallbackRedirectUrl({ configuredCallbackRedirectUrl, hasConfiguredCallbackRedirectUrl, sessionCallbackRedirectUrl, }: ResolveCallbackRedirectUrlOptions): string;
export {};
