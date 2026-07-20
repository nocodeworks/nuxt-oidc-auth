/**
 * Nocodeworks TabiGuide (OpenIddict) provider
 * Public Client + PKCE (no client_secret)
 * baseUrl must be set to the OpenIddict Authority base URL (e.g. https://identity.local.tareho.com)
 */
export declare const tabiGuide: Partial<Partial<Omit<import("../server/utils/provider.js.js").OidcProviderConfig, "requiredProperties"> & {
    requiredProperties?: (keyof import("../server/utils/provider.js.js").OidcProviderConfig)[] | undefined;
}> & object & {
    additionalAuthParameters?: object | undefined;
    additionalTokenParameters?: object | undefined;
    additionalLogoutParameters?: object | undefined;
}> & Required<Pick<Partial<Partial<Omit<import("../server/utils/provider.js.js").OidcProviderConfig, "requiredProperties"> & {
    requiredProperties?: (keyof import("../server/utils/provider.js.js").OidcProviderConfig)[] | undefined;
}> & object & {
    additionalAuthParameters?: object | undefined;
    additionalTokenParameters?: object | undefined;
    additionalLogoutParameters?: object | undefined;
}>, "redirectUri">>;
