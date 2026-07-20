import { normalizeURL, withHttps, withoutTrailingSlash } from "ufo";
import { createProviderFetch, defineOidcProvider } from "../server/utils/provider.js";
export const logto = defineOidcProvider({
  logoutRedirectParameterName: "post_logout_redirect_uri",
  tokenRequestType: "form-urlencoded",
  authenticationScheme: "body",
  userInfoUrl: "oidc/me",
  pkce: true,
  state: true,
  nonce: true,
  scopeInTokenRequest: false,
  userNameClaim: "",
  authorizationUrl: "/oidc/auth",
  tokenUrl: "/oidc/token",
  logoutUrl: "/oidc/session/end",
  scope: ["profile", "openid", "offline_access"],
  requiredProperties: ["baseUrl", "clientId", "clientSecret", "authorizationUrl", "tokenUrl"],
  // For offline_access, we set prompt to 'consent'
  additionalAuthParameters: {
    prompt: "consent"
  },
  additionalLogoutParameters: {
    idTokenHint: ""
  },
  async openIdConfiguration(config) {
    const baseUrl = normalizeURL(withoutTrailingSlash(withHttps(config.baseUrl)));
    const customFetch = await createProviderFetch(config);
    return await customFetch(`${baseUrl}/oidc/.well-known/openid-configuration`);
  },
  skipAccessTokenParsing: true,
  validateAccessToken: false,
  validateIdToken: true,
  exposeIdToken: true
});
