import type { AuthSession, UserSession } from '../../types.js';
import type { H3Event } from 'h3';
export type SessionErrorBehavior = 'throw' | 'redirect';
export interface SessionBehaviorOptions {
    errorBehavior?: SessionErrorBehavior;
}
export interface SessionHooks {
    /**
     * Called when fetching the session from the API
     */
    fetch: (session: UserSession, event: H3Event) => void | Promise<void>;
    /**
     * Called before clearing the session
     */
    clear: (event: H3Event) => void | Promise<void>;
    /**
     * Called before refreshing the session
     */
    refresh: (session: UserSession, event: H3Event) => void | Promise<void>;
}
export interface LogoutHooks {
    [key: string]: () => void | Promise<void>;
}
export declare function useAuthSession(event: H3Event, maxAge?: number): Promise<import("h3").SessionManager<AuthSession>>;
export declare const sessionHooks: import("hookable").Hookable<SessionHooks, import("hookable").HookKeys<SessionHooks>>;
export declare const logoutHooks: import("hookable").Hookable<LogoutHooks, string>;
/**
 * Set a user session
 * @param event
 * @param data User session data, please only store public information since it can be decoded with API calls
 */
export declare function setUserSession(event: H3Event, data: UserSession): Promise<UserSession>;
export declare function clearUserSession(event: H3Event, skipHook?: boolean): Promise<void>;
export declare function refreshUserSession(event: H3Event, options?: SessionBehaviorOptions): Promise<any>;
export declare function requireUserSession(event: H3Event, options?: SessionBehaviorOptions): Promise<any>;
export declare function getUserSession(event: H3Event, options?: SessionBehaviorOptions): Promise<any>;
export declare function getUserSessionId(event: H3Event): Promise<string>;
export declare function getSingleSignOutSessionId(event: H3Event): Promise<string | undefined>;
