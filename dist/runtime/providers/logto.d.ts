import type { OidcProviderConfig } from '../server/utils/provider.js';
interface LogtoProviderConfig {
    /**
     * Specifies the first screen that the user will see.
     * @default undefined
     */
    firstScreen?: string;
    /**
     * Specifies the identifier types that the sign-in or sign-up form will accept.
     * @default undefined
     */
    identifier?: string;
    /**
     * Populates the identifier field with the user's email address or username. (This is a OIDC standard parameter)
     * @default undefined
     */
    loginHint?: string;
    /**
     * Indicates the type of user interaction that is required. Valid values are login, none, consent, and select_account.
     * @default undefined
     */
    prompt?: 'login' | 'none' | 'consent' | 'select_account';
}
export declare const logto: Partial<Partial<Omit<OidcProviderConfig, "requiredProperties"> & {
    requiredProperties?: (keyof OidcProviderConfig)[] | undefined;
}> & object & {
    additionalAuthParameters?: Partial<LogtoProviderConfig> | undefined;
    additionalTokenParameters?: Partial<LogtoProviderConfig> | undefined;
    additionalLogoutParameters?: Partial<LogtoProviderConfig> | undefined;
}> & Required<Pick<Partial<Partial<Omit<OidcProviderConfig, "requiredProperties"> & {
    requiredProperties?: (keyof OidcProviderConfig)[] | undefined;
}> & object & {
    additionalAuthParameters?: Partial<LogtoProviderConfig> | undefined;
    additionalTokenParameters?: Partial<LogtoProviderConfig> | undefined;
    additionalLogoutParameters?: Partial<LogtoProviderConfig> | undefined;
}>, never>>;
export {};
