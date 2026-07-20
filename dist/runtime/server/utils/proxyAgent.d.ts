export declare function getUndiciModule(): Promise<typeof import("undici") | null>;
export declare function getProxyAgentOfetch(proxyUrl: string, ignoreProxyCertificateErrors?: boolean): Promise<import("ofetch").$Fetch>;
