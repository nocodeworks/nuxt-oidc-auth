import { useRuntimeConfig } from "#imports";
import { eventHandler, getQuery, getRequestHeader, sendRedirect } from "h3";
import { withQuery } from "ufo";
import * as providerPresets from "../../providers/index.js";
import { validateConfig } from "../utils/config.js";
import {
  configMerger,
  convertObjectToSnakeCase,
  oidcErrorHandler,
  useOidcLogger
} from "../utils/oidc.js";
import { sanitizeCallbackRedirectUrl } from "../utils/redirect.js";
import {
  generatePkceCodeChallenge,
  generatePkceVerifier,
  generateRandomUrlSafeString
} from "../utils/security.js";
import { useAuthSession } from "../utils/session.js";
function loginEventHandler() {
  const logger = useOidcLogger();
  return eventHandler(async (event) => {
    const provider = event.path.split("/")[2];
    const config = configMerger(
      useRuntimeConfig().oidc.providers[provider],
      providerPresets[provider]
    );
    const validationResult = validateConfig(config, config.requiredProperties);
    if (!validationResult.valid) {
      logger.error(
        `[${provider}] Missing or empty configuration properties:`,
        validationResult.missingProperties?.join(", ")
      );
      return oidcErrorHandler(event, "Invalid configuration");
    }
    const session = await useAuthSession(event, config.sessionConfiguration?.maxAuthSessionAge);
    await session.clear();
    await session.update({
      state: generateRandomUrlSafeString(),
      codeVerifier: generatePkceVerifier(),
      referer: getRequestHeader(event, "referer"),
      nonce: void 0
    });
    const clientQueryParams = getQuery(event);
    const additionalClientAuthParameters = {};
    if (config.allowedClientAuthParameters?.length) {
      config.allowedClientAuthParameters.forEach((param) => {
        if (clientQueryParams[param]) {
          additionalClientAuthParameters[param] = clientQueryParams[param];
        }
      });
    }
    const callbackRedirectUrlParam = Array.isArray(clientQueryParams.callbackRedirectUrl) ? clientQueryParams.callbackRedirectUrl[0] : clientQueryParams.callbackRedirectUrl;
    const callbackRedirectUrl = sanitizeCallbackRedirectUrl(callbackRedirectUrlParam);
    if (callbackRedirectUrl) {
      await session.update({ callbackRedirectUrl });
    }
    let clientRedirectUri;
    if (config.allowedCallbackRedirectUrls?.length) {
      if (clientQueryParams.redirectUri) {
        clientRedirectUri = config.allowedCallbackRedirectUrls.some((callbackUrl) => {
          const redirectUri = clientQueryParams.redirectUri;
          if (!redirectUri.startsWith(callbackUrl)) return false;
          if (callbackUrl.endsWith("/")) return true;
          const nextChar = redirectUri[callbackUrl.length];
          return nextChar === void 0 || nextChar === "/" || nextChar === "?" || nextChar === "#";
        }) ? clientQueryParams.redirectUri : void 0;
      }
      if (clientRedirectUri) {
        await session.update({ redirect: clientRedirectUri });
      }
    }
    const query = {
      client_id: config.clientId,
      response_type: config.responseType,
      ...config.state && { state: session.data.state },
      ...config.scope && { scope: config.scope.join(" ") },
      ...config.responseMode && { response_mode: config.responseMode },
      ...config.redirectUri && { redirect_uri: clientRedirectUri || config.redirectUri },
      ...config.prompt && { prompt: config.prompt.join(" ") },
      ...config.pkce && {
        code_challenge: await generatePkceCodeChallenge(session.data.codeVerifier),
        code_challenge_method: "S256"
      },
      ...config.additionalAuthParameters && convertObjectToSnakeCase(config.additionalAuthParameters),
      ...additionalClientAuthParameters && convertObjectToSnakeCase(additionalClientAuthParameters)
    };
    if (config.responseType.includes("token") || config.nonce) {
      const nonce = generateRandomUrlSafeString();
      await session.update({ nonce });
      query.response_mode = "form_post";
      query.nonce = nonce;
      if (!query.scope?.includes("openid")) query.scope = `openid ${query.scope}`;
    }
    return sendRedirect(
      event,
      config.encodeRedirectUri ? withQuery(config.authorizationUrl, query).replace(
        query.redirect_uri,
        encodeURI(query.redirect_uri)
      ) : withQuery(config.authorizationUrl, query),
      302
    );
  });
}
export default loginEventHandler();
