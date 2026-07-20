import type { RefreshTokenRequest, TokenRequest, UserSession } from '../../types.js';
import type { H3Event } from 'h3';
import type { OidcProviderConfig } from './provider.js';
export declare function useOidcLogger(): import("consola").ConsolaInstance;
export declare const configMerger: import("defu").DefuFn;
export declare function refreshAccessToken(refreshToken: string, config: OidcProviderConfig): Promise<{
    user: Omit<UserSession, "provider">;
    tokens: Record<"accessToken" | "idToken" | "refreshToken", string>;
    expiresIn: string;
    parsedAccessToken: import("./security.js").JwtPayload | Record<string, never>;
}>;
export declare function generateFormDataRequest(requestValues: RefreshTokenRequest | TokenRequest): FormData;
export declare function generateFormUrlEncodedRequest(requestValues: RefreshTokenRequest | TokenRequest): URLSearchParams;
export declare function convertTokenRequestToType(requestValues: RefreshTokenRequest | TokenRequest, requestType?: OidcProviderConfig['tokenRequestType']): FormData | URLSearchParams | RefreshTokenRequest | TokenRequest;
export declare function convertObjectToSnakeCase<T>(object: Record<string, T>): Record<string, T>;
export declare function oidcErrorHandler(event: H3Event, errorText: string, errorCode?: number): Promise<void>;
