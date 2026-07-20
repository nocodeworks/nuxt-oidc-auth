import { useRuntimeConfig } from "#imports";
import { defu } from "defu";
import { createError, deleteCookie, sendRedirect, useSession } from "h3";
import { createHooks } from "hookable";
import { useStorage } from "nitropack/runtime";
import * as providerPresets from "../../providers/index.js";
import { configMerger, refreshAccessToken, useOidcLogger } from "./oidc.js";
import { decryptToken, encryptToken } from "./security.js";
import { resolveMissingPersistentSessionMode } from "./session-options.js";
const DEFAULT_SESSION_NAME = "nuxt-oidc-auth";
let sessionConfig;
const providerSessionConfigs = {};
export async function useAuthSession(event, maxAge = 300) {
  const session = await useSession(event, {
    name: "oidc",
    password: process.env.NUXT_OIDC_AUTH_SESSION_SECRET,
    maxAge
  });
  return session;
}
export const sessionHooks = createHooks();
export const logoutHooks = createHooks();
export async function setUserSession(event, data) {
  const session = await _useSession(event);
  await session.update(defu(data, session.data));
  return session.data;
}
export async function clearUserSession(event, skipHook = false) {
  const session = await _useSession(event);
  const sessionId = session.id;
  let singleSignOutSessionId;
  if (session.data.singleSignOut) {
    const persistentSession = await useStorage("oidc").getItem(
      sessionId
    );
    singleSignOutSessionId = persistentSession?.singleSignOutId;
  }
  await useStorage("oidc").removeItem(sessionId);
  if (!skipHook) {
    await sessionHooks.callHookParallel("clear", event);
  }
  await session.clear();
  deleteCookie(event, sessionConfig?.name || DEFAULT_SESSION_NAME);
  if (singleSignOutSessionId) {
    await logoutHooks.callHookParallel(singleSignOutSessionId);
  } else {
    await logoutHooks.callHookParallel(sessionId);
  }
}
async function handleSessionError(event, message, options = {}) {
  if (options.errorBehavior === "redirect") {
    return await sendRedirect(event, "/", 302);
  }
  throw createError({
    statusCode: 401,
    message
  });
}
export async function refreshUserSession(event, options = {}) {
  const session = await _useSession(event);
  const provider = session.data.provider;
  const persistentSession = await useStorage("oidc").getItem(
    session.id
  );
  const logger = useOidcLogger();
  if (!session.data.canRefresh || !persistentSession?.refreshToken) {
    await clearUserSession(event);
    return await handleSessionError(
      event,
      `[${provider}] Token refresh failed: No refresh token`,
      options
    );
  }
  const tokenKey = process.env.NUXT_OIDC_TOKEN_KEY;
  const refreshToken = await decryptToken(persistentSession.refreshToken, tokenKey);
  const config = configMerger(
    useRuntimeConfig().oidc.providers[provider],
    providerPresets[provider]
  );
  let tokenRefreshResponse;
  try {
    tokenRefreshResponse = await refreshAccessToken(refreshToken, config);
  } catch (error) {
    logger.error(`[${provider}] Token refresh failed: ${String(error)}`);
    await clearUserSession(event);
    return await handleSessionError(event, `[${provider}] Token refresh failed`, options);
  }
  const { user, tokens, expiresIn, parsedAccessToken } = tokenRefreshResponse;
  const updatedPersistentSession = {
    createdAt: persistentSession.createdAt,
    updatedAt: /* @__PURE__ */ new Date(),
    exp: parsedAccessToken.exp || Math.trunc(Date.now() / 1e3) + Number.parseInt(expiresIn),
    iat: parsedAccessToken.iat || Math.trunc(Date.now() / 1e3),
    accessToken: await encryptToken(tokens.accessToken, tokenKey),
    refreshToken: await encryptToken(tokens.refreshToken, tokenKey),
    ...tokens.idToken && { idToken: await encryptToken(tokens.idToken, tokenKey) },
    ...persistentSession.singleSignOutId && {
      singleSignOutId: persistentSession.singleSignOutId
    }
  };
  await useStorage("oidc").setItem(
    session.id,
    updatedPersistentSession
  );
  const { accessToken: _accessToken, idToken: _idToken, ...userWithoutToken } = user;
  const sessionName = sessionConfig?.name || DEFAULT_SESSION_NAME;
  const rawSession = event.context.sessions?.[sessionName];
  if (rawSession) {
    rawSession.createdAt = Date.now();
  }
  await session.update(defu(userWithoutToken, session.data));
  return {
    ...session.data,
    ...tokens.accessToken && (useRuntimeConfig(event).oidc.providers[provider]?.exposeAccessToken || providerPresets[provider]?.exposeAccessToken) && { accessToken: tokens.accessToken },
    ...tokens.idToken && (useRuntimeConfig(event).oidc.providers[provider]?.exposeIdToken || providerPresets[provider]?.exposeIdToken) && { idToken: tokens.idToken }
  };
}
export async function requireUserSession(event, options = {}) {
  return await getUserSession(event, options);
}
export async function getUserSession(event, options = {}) {
  const logger = useOidcLogger();
  const session = await _useSession(event);
  const userSession = session.data;
  if (Object.keys(userSession).length === 0) {
    return await handleSessionError(event, "Unauthorized", options);
  }
  const provider = userSession.provider;
  if (providerSessionConfigs[provider]?.expirationCheck) {
    const sessionId = session.id;
    let persistentSession = null;
    if (userSession.canRefresh) {
      persistentSession = await useStorage("oidc").getItem(
        sessionId
      );
      if (!persistentSession) {
        const missingPersistentSessionMode = resolveMissingPersistentSessionMode(
          providerSessionConfigs[provider],
          userSession
        );
        if (missingPersistentSessionMode === "clear") {
          logger.info("Persistent user session not found, clearing stale session");
          await clearUserSession(event);
          return await handleSessionError(event, "Session not found", options);
        }
        if (missingPersistentSessionMode === "warn") {
          logger.warn("Persistent user session not found");
        }
      }
    }
    let expired = true;
    if (persistentSession) {
      expired = persistentSession?.exp <= Math.trunc(Date.now() / 1e3) + (providerSessionConfigs[provider].expirationThreshold && typeof providerSessionConfigs[provider].expirationThreshold === "number" ? providerSessionConfigs[provider].expirationThreshold : 0);
    } else if (userSession) {
      expired = userSession?.expireAt <= Math.trunc(Date.now() / 1e3) + (providerSessionConfigs[provider].expirationThreshold && typeof providerSessionConfigs[provider].expirationThreshold === "number" ? providerSessionConfigs[provider].expirationThreshold : 0);
    } else {
      throw createError({
        statusCode: 401,
        message: "Session not found"
      });
    }
    if (expired) {
      logger.info("Session expired");
      if (providerSessionConfigs[provider].automaticRefresh) {
        return await refreshUserSession(event, options);
      } else {
        logger.warn("Session expired, automatic refresh disabled");
        await clearUserSession(event);
        return await handleSessionError(event, "Session expired", options);
      }
    }
  }
  const providerConfig = useRuntimeConfig(event).oidc.providers[provider];
  const exposeAccessToken = providerConfig?.exposeAccessToken || providerPresets[provider]?.exposeAccessToken;
  const exposeIdToken = providerConfig?.exposeIdToken || providerPresets[provider]?.exposeIdToken;
  if (exposeAccessToken || exposeIdToken) {
    const persistentSession = await useStorage("oidc").getItem(
      session.id
    );
    const tokenKey = process.env.NUXT_OIDC_TOKEN_KEY;
    if (exposeAccessToken && persistentSession)
      userSession.accessToken = await decryptToken(persistentSession.accessToken, tokenKey);
    if (exposeIdToken && persistentSession?.idToken)
      userSession.idToken = await decryptToken(persistentSession.idToken, tokenKey) || void 0;
  }
  return userSession;
}
export async function getUserSessionId(event) {
  return (await _useSession(event)).id;
}
export async function getSingleSignOutSessionId(event) {
  const session = await _useSession(event);
  const persistentSession = await useStorage("oidc").getItem(
    session.id
  );
  if (session.data.canRefresh && !persistentSession) {
    return void 0;
  }
  return persistentSession?.singleSignOutId || session.id;
}
function resolveSessionName(config) {
  const customName = config?.cookieName;
  return customName && customName.length > 0 ? customName : DEFAULT_SESSION_NAME;
}
function _useSession(event) {
  if (!sessionConfig || !Object.keys(providerSessionConfigs).length) {
    const runtimeConfig = useRuntimeConfig(event).oidc;
    const config = runtimeConfig.session;
    const missingPersistentSession = config.missingPersistentSession;
    const sessionName = resolveSessionName(config);
    sessionConfig = defu(
      { password: process.env.NUXT_OIDC_SESSION_SECRET, name: sessionName },
      config
    );
    for (const key of Object.keys(runtimeConfig.providers)) {
      providerSessionConfigs[key] = defu(
        runtimeConfig.providers[key]?.sessionConfiguration,
        providerPresets[key].sessionConfiguration,
        {
          automaticRefresh: config.automaticRefresh,
          expirationCheck: config.expirationCheck,
          expirationThreshold: config.expirationThreshold,
          missingPersistentSession
        }
      );
    }
  }
  return useSession(event, sessionConfig);
}
