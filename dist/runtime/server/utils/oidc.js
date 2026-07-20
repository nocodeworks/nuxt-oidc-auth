import { createConsola } from "consola";
import { createDefu } from "defu";
import { sendRedirect } from "h3";
import { normalizeURL } from "ufo";
import { createProviderFetch } from "./provider.js";
import { textToBase64 } from "./encoding.js";
import { parseJwtToken } from "./security.js";
import { clearUserSession } from "./session.js";
import { snakeCase } from "./string.js";
export function useOidcLogger() {
  return createConsola().withDefaults({ tag: "nuxt-oidc-auth", message: "[nuxt-oidc-auth]:" });
}
export const configMerger = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key]) && Array.isArray(value)) {
    obj[key] = key === "requiredProperties" ? [.../* @__PURE__ */ new Set([...obj[key], ...value])] : value;
    return true;
  }
});
export async function refreshAccessToken(refreshToken, config) {
  const logger = useOidcLogger();
  const customFetch = await createProviderFetch(config);
  const headers = {};
  if (config.authenticationScheme === "header") {
    const encodedCredentials = textToBase64(`${config.clientId}:${config.clientSecret}`, {
      dataURL: false
    });
    headers.authorization = `Basic ${encodedCredentials}`;
  }
  const requestBody = {
    client_id: config.clientId,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    ...config.scopeInTokenRequest && config.scope && {
      scope: config.excludeOfflineScopeFromTokenRequest ? config.scope.filter((s) => s !== "offline_access").join(" ") : config.scope.join(" ")
    },
    ...config.authenticationScheme === "body" && {
      client_secret: normalizeURL(config.clientSecret)
    }
  };
  let tokenResponse;
  try {
    tokenResponse = await customFetch(config.tokenUrl, {
      method: "POST",
      headers,
      body: convertTokenRequestToType(requestBody, config.tokenRequestType)
    });
  } catch (error) {
    const fetchError = error;
    throw new Error(
      fetchError?.data ? `${fetchError.data.error}: ${fetchError.data.error_description}` : String(error)
    );
  }
  const tokens = {
    refreshToken: tokenResponse.refresh_token || refreshToken,
    accessToken: tokenResponse.access_token,
    idToken: tokenResponse.id_token || ""
  };
  const accessToken = parseJwtToken(tokenResponse.access_token, !!config.skipAccessTokenParsing);
  const user = {
    canRefresh: !!tokens.refreshToken,
    updatedAt: Math.trunc(Date.now() / 1e3),
    // Use seconds instead of milliseconds to align wih JWT
    expireAt: accessToken.exp || Math.trunc(Date.now() / 1e3) + 3600
    // Fallback 60 min
  };
  if (config.optionalClaims && tokenResponse.id_token) {
    const parsedIdToken = parseJwtToken(tokenResponse.id_token);
    user.claims = {};
    config.optionalClaims.forEach((claim) => {
      if (parsedIdToken[claim]) {
        ;
        user.claims[claim] = parsedIdToken[claim];
      }
    });
  }
  logger.info("Successfully refreshed token");
  return {
    user,
    tokens,
    expiresIn: tokenResponse.expires_in,
    parsedAccessToken: accessToken
  };
}
export function generateFormDataRequest(requestValues) {
  const requestBody = new FormData();
  Object.keys(requestValues).forEach((key) => {
    requestBody.append(
      key,
      normalizeURL(requestValues[key])
    );
  });
  return requestBody;
}
export function generateFormUrlEncodedRequest(requestValues) {
  const requestBody = new URLSearchParams();
  Object.entries(requestValues).forEach((key) => {
    if (typeof key[1] === "string") requestBody.append(key[0], normalizeURL(key[1]));
  });
  return requestBody;
}
export function convertTokenRequestToType(requestValues, requestType = "form") {
  switch (requestType) {
    case "json":
      return requestValues;
    case "form-urlencoded":
      return generateFormUrlEncodedRequest(requestValues);
    default:
      return generateFormDataRequest(requestValues);
  }
}
export function convertObjectToSnakeCase(object) {
  return Object.entries(object).reduce(
    (acc, [key, value]) => {
      acc[snakeCase(key)] = value;
      return acc;
    },
    {}
  );
}
export async function oidcErrorHandler(event, errorText, errorCode = 500) {
  const logger = useOidcLogger();
  await clearUserSession(event, true);
  logger.error(errorText, "- Code:", errorCode);
  return sendRedirect(event, "/", 302);
}
