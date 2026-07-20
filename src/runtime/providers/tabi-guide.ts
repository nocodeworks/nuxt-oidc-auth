import { defineOidcProvider } from '../server/utils/provider.js'

type TabiGuideRequiredFields = 'clientId' | 'baseUrl' | 'redirectUri'

/**
 * Nocodeworks TabiGuide (OpenIddict) provider
 * Public Client + PKCE (no client_secret)
 * baseUrl must be set to the OpenIddict Authority base URL (e.g. https://identity.local.tareho.com)
 */
export const tabiGuide = defineOidcProvider<object, TabiGuideRequiredFields>({
  clientSecret: '',
  grantType: 'authorization_code',
  responseType: 'code',
  authorizationUrl: 'connect/authorize',
  tokenUrl: 'connect/token',
  userInfoUrl: 'connect/userinfo',
  logoutUrl: 'connect/endsession',
  logoutRedirectParameterName: 'post_logout_redirect_uri',
  scope: ['openid', 'profile', 'offline_access', 'api1'],
  pkce: true,
  state: true,
  nonce: false,
  validateAccessToken: false,
  validateIdToken: false,
  skipAccessTokenParsing: false,
  requiredProperties: ['clientId', 'baseUrl', 'redirectUri'],
  sessionConfiguration: {
    expirationCheck: true,
    automaticRefresh: true,
  },
})
