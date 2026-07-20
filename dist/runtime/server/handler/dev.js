import { useRuntimeConfig } from "#imports";
import { createError, deleteCookie, eventHandler, getQuery, sendRedirect } from "h3";
import { importJWK, SignJWT } from "jose";
import { getOrCreateDevModeKeyPair } from "../utils/devModeKeys.js";
import { useOidcLogger } from "../utils/oidc.js";
import { sanitizeCallbackRedirectUrl } from "../utils/redirect.js";
import { generateRandomUrlSafeString } from "../utils/security.js";
import { setUserSession, useAuthSession } from "../utils/session.js";
export function devEventHandler({ onSuccess }) {
  const logger = useOidcLogger();
  return eventHandler(async (event) => {
    if (process.env.NODE_ENV === "production") {
      throw createError({ statusCode: 404, message: "Not Found" });
    }
    logger.warn("Using dev auth handler with static auth information");
    const session = await useAuthSession(event);
    const config = useRuntimeConfig().oidc.devMode;
    const query = getQuery(event);
    const callbackRedirectUrl = sanitizeCallbackRedirectUrl(
      Array.isArray(query.callbackRedirectUrl) ? query.callbackRedirectUrl[0] : query.callbackRedirectUrl
    );
    const timestamp = Math.trunc(Date.now() / 1e3);
    const user = {
      canRefresh: false,
      loggedInAt: timestamp,
      updatedAt: timestamp,
      expireAt: timestamp + 86400,
      provider: "dev",
      userName: config?.userName || "Nuxt OIDC Auth Dev",
      ...config?.userInfo && { userInfo: config.userInfo },
      ...config?.idToken && { idToken: config.idToken },
      ...config?.accessToken && { accessToken: config.accessToken },
      ...config?.claims && { claims: config.claims }
    };
    if (config?.generateAccessToken) {
      let key;
      let alg;
      let kid;
      if (config?.tokenAlgorithm !== "symmetric") {
        const keyPair = await getOrCreateDevModeKeyPair();
        key = await importJWK(keyPair.privateKey, "RS256");
        alg = "RS256";
        kid = keyPair.kid;
      } else {
        alg = "HS256";
        key = new TextEncoder().encode(generateRandomUrlSafeString());
      }
      const jwt = await new SignJWT(config?.claims || {}).setProtectedHeader({ alg, ...kid && { kid } }).setIssuedAt().setIssuer(config?.issuer || "nuxt:oidc:auth:issuer").setAudience(config?.audience || "nuxt:oidc:auth:audience").setExpirationTime("24h").setSubject(config?.subject || "nuxt:oidc:auth:subject").sign(key);
      user.accessToken = jwt;
    }
    await session.clear();
    deleteCookie(event, "oidc");
    return onSuccess(event, {
      user,
      callbackRedirectUrl
    });
  });
}
export default devEventHandler({
  async onSuccess(event, { user, callbackRedirectUrl }) {
    await setUserSession(event, user);
    return sendRedirect(event, callbackRedirectUrl || "/");
  }
});
