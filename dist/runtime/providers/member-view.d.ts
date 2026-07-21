/**
 * Nocodeworks Member View (OpenIddict) provider
 * Public Client + PKCE (no client_secret)
 * baseUrl must be set to the OpenIddict Authority base URL (e.g. https://stage.identity.tareho.com)
 *
 * scope は member-view の runtime 用途に揃える (`openid profile email offline_access member-api`)。
 * tabi-guide (api1 scope) との違いはこの scope のみ。他の URL は同じ OpenIddict 標準。
 */
export declare const memberView: Partial<Partial<Omit<import("../server/utils/provider.js.js").OidcProviderConfig, "requiredProperties"> & {
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
