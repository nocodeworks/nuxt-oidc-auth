import { normalizeURL, withHttps, withoutTrailingSlash } from "ufo";
import { createProviderFetch, defineOidcProvider } from "../server/utils/provider.js";
export const auth0 = defineOidcProvider({
  tokenRequestType: "json",
  authenticationScheme: "body",
  userInfoUrl: "userinfo",
  pkce: true,
  state: true,
  nonce: false,
  scopeInTokenRequest: false,
  userNameClaim: "",
  authorizationUrl: "authorize",
  tokenUrl: "oauth/token",
  logoutUrl: "",
  requiredProperties: ["baseUrl", "clientId", "clientSecret", "authorizationUrl", "tokenUrl"],
  async openIdConfiguration(config) {
    const baseUrl = normalizeURL(withoutTrailingSlash(withHttps(config.baseUrl)));
    const customFetch = await createProviderFetch(config);
    return await customFetch(`${baseUrl}/.well-known/openid-configuration`);
  },
  validateAccessToken: true,
  validateIdToken: false
});
