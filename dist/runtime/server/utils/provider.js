import { createDefu } from "defu";
import { ofetch } from "ofetch";
import { getProxyAgentOfetch } from "./proxyAgent.js";
const configMerger = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key]) && Array.isArray(value)) {
    obj[key] = key === "requiredProperties" ? [.../* @__PURE__ */ new Set([...obj[key], ...value])] : value;
    return true;
  }
});
export function defineOidcProvider(config = {}) {
  const defaults = {
    clientId: "",
    redirectUri: "",
    clientSecret: "",
    authorizationUrl: "",
    tokenUrl: "",
    responseType: "code",
    authenticationScheme: "header",
    grantType: "authorization_code",
    pkce: true,
    state: true,
    nonce: false,
    scope: ["openid"],
    scopeInTokenRequest: false,
    tokenRequestType: "form",
    requiredProperties: ["clientId", "redirectUri", "clientSecret", "authorizationUrl", "tokenUrl"],
    validateAccessToken: true,
    validateIdToken: true,
    skipAccessTokenParsing: false,
    exposeAccessToken: false,
    exposeIdToken: false,
    callbackRedirectUrl: "/",
    allowedClientAuthParameters: void 0,
    logoutUrl: "",
    sessionConfiguration: {
      automaticRefresh: true,
      expirationThreshold: 0,
      expirationCheck: true,
      singleSignOut: false,
      singleSignOutIdField: "sub"
    },
    additionalAuthParameters: void 0,
    additionalTokenParameters: void 0,
    additionalLogoutParameters: void 0,
    excludeOfflineScopeFromTokenRequest: false
  };
  const mergedConfig = configMerger(config, defaults);
  return mergedConfig;
}
export async function createProviderFetch(config) {
  if (config.proxy) {
    return await getProxyAgentOfetch(config.proxy, config.ignoreProxyCertificateErrors);
  }
  return ofetch;
}
