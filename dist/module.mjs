import { createResolver, defineNuxtModule, addTypeTemplate, useLogger, addImportsDir, addPlugin, addServerPlugin, addServerHandler, extendRouteRules, addRouteMiddleware } from '@nuxt/kit';
import { defu } from 'defu';
import { existsSync } from 'node:fs';
import { onDevToolsInitialized, extendServerRpc } from '@nuxt/devtools-kit';
import * as providerPresets from '../dist/runtime/providers/index.js';
import { generateProviderUrl, replaceInjectedParameters } from '../dist/runtime/server/utils/config.js';

const DEVTOOLS_UI_ROUTE = "/__nuxt-oidc-auth";
const DEVTOOLS_UI_LOCAL_PORT = 3300;
const RPC_NAMESPACE = "nuxt-oidc-auth-rpc";
function setupDevToolsUI(nuxt, resolver) {
  const clientPath = resolver.resolve("./client");
  const isProductionBuild = existsSync(clientPath);
  if (isProductionBuild) {
    nuxt.hook("vite:serverCreated", async (server) => {
      const sirv = await import('sirv').then((r) => r.default || r);
      server.middlewares.use(DEVTOOLS_UI_ROUTE, sirv(clientPath, { dev: true, single: true }));
    });
  } else {
    nuxt.hook("vite:extendConfig", (config) => {
      const server = {
        ...config.server || {},
        proxy: {
          ...config.server?.proxy || {},
          [DEVTOOLS_UI_ROUTE]: {
            target: `http://localhost:${DEVTOOLS_UI_LOCAL_PORT}${DEVTOOLS_UI_ROUTE}`,
            changeOrigin: true,
            followRedirects: true,
            rewrite: (path) => path.replace(DEVTOOLS_UI_ROUTE, "")
          }
        }
      };
      Object.assign(config, { server });
    });
  }
  onDevToolsInitialized(async () => {
    extendServerRpc(RPC_NAMESPACE, {
      async getNuxtOidcAuthSecrets(token) {
        const devtools = nuxt.devtools;
        if (!devtools) {
          throw new Error("[nuxt-oidc-auth] Nuxt DevTools context is unavailable.");
        }
        await devtools.ensureDevAuthToken(token);
        const tokenKey = process.env.NUXT_OIDC_TOKEN_KEY || "";
        const sessionSecret = process.env.NUXT_OIDC_SESSION_SECRET || "";
        const authSessionSecret = process.env.NUXT_OIDC_AUTH_SESSION_SECRET || "";
        return {
          tokenKey,
          sessionSecret,
          authSessionSecret
        };
      }
    });
  });
  nuxt.hook(
    "devtools:customTabs",
    (tabs) => {
      tabs.push({
        name: "nuxt-oidc-auth",
        title: "Nuxt OIDC Auth",
        icon: "carbon:rule-locked",
        view: {
          type: "iframe",
          src: DEVTOOLS_UI_ROUTE
        }
      });
    }
  );
}

const { resolve } = createResolver(import.meta.url);
const PLACEHOLDER_RE = /\{(.*?)\}/g;
const DEFAULTS = {
  enabled: true,
  session: {
    automaticRefresh: true,
    expirationCheck: true,
    missingPersistentSession: "clear",
    maxAge: 60 * 60 * 24,
    // 1 day
    maxAuthSessionAge: 300,
    // 5 minutes
    cookie: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  },
  providers: {},
  middleware: {
    globalMiddlewareEnabled: true,
    customLoginPage: false,
    customLogoutPage: false
  },
  provideDefaultSecrets: true,
  devtools: true
};
const module$1 = defineNuxtModule({
  meta: {
    name: "nuxt-oidc-auth",
    configKey: "oidc",
    compatibility: {
      nuxt: ">=3.9.0"
    }
  },
  defaults: DEFAULTS,
  setup(options, nuxt) {
    const modulePath = JSON.stringify(resolve("./module"));
    const schemaTemplate = addTypeTemplate({
      filename: "types/nuxt-oidc-auth-schema.d.ts",
      getContents: () => `import type { ModuleOptions } from ${modulePath}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    oidc?: Partial<ModuleOptions>
  }

  interface RuntimeConfig {
    oidc: ModuleOptions
  }
}

declare module 'nuxt/schema' {
  interface NuxtConfig {
    oidc?: Partial<ModuleOptions>
  }

  interface RuntimeConfig {
    oidc: ModuleOptions
  }
}

export {}
`
    });
    nuxt.hook("prepare:types", ({ nodeReferences, sharedReferences }) => {
      sharedReferences.push({ path: schemaTemplate.dst });
      nodeReferences.push({ path: schemaTemplate.dst });
    });
    nuxt.hook("nitro:prepare:types", ({ references }) => {
      references.push({ path: schemaTemplate.dst });
    });
    const logger = useLogger("nuxt-oidc-auth");
    if (!options.enabled) return;
    nuxt.options.alias["#oidc-auth"] = resolve("./runtime/types");
    addImportsDir(resolve("./runtime/composables"));
    addPlugin(resolve("./runtime/plugins/session.client"));
    addPlugin(resolve("./runtime/plugins/session.server"));
    if (options.provideDefaultSecrets) {
      addServerPlugin(resolve("./runtime/plugins/provideDefaults"));
    }
    if (nuxt.options.nitro.imports !== false) {
      nuxt.options.nitro.imports = defu(nuxt.options.nitro.imports, {
        presets: [
          {
            from: resolve("./runtime/server/utils/session"),
            imports: ["sessionHooks"]
          }
        ]
      });
    }
    addServerHandler({
      handler: resolve("./runtime/server/api/session.delete"),
      route: "/api/_auth/session",
      method: "delete"
    });
    addServerHandler({
      handler: resolve("./runtime/server/api/session.get"),
      route: "/api/_auth/session",
      method: "get"
    });
    addServerHandler({
      handler: resolve("./runtime/server/api/refresh.post"),
      route: "/api/_auth/refresh",
      method: "post"
    });
    const providers = Object.keys(options.providers);
    if (!options.defaultProvider && providers.length === 1) {
      options.defaultProvider = providers[0];
    }
    const isNonProductionEnvironment = process.env.NODE_ENV && !process.env.NODE_ENV.toLowerCase().startsWith("prod");
    if (options.devMode?.enabled && !isNonProductionEnvironment) {
      logger.warn("Dev mode is enabled in config but will be ignored in production.");
    }
    if (isNonProductionEnvironment && options.devMode?.enabled) {
      extendRouteRules("/auth/login", {
        redirect: {
          to: "/auth/dev/login",
          statusCode: 302
        }
      });
      extendRouteRules("/auth/logout", {
        redirect: {
          to: `/auth/dev/logout`,
          statusCode: 302
        }
      });
    } else {
      if (options.defaultProvider) {
        if (!options.middleware.customLoginPage) {
          extendRouteRules("/auth/login", {
            redirect: {
              to: `/auth/${options.defaultProvider}/login`,
              statusCode: 302
            }
          });
        }
        if (!options.middleware.customLogoutPage) {
          extendRouteRules("/auth/logout", {
            redirect: {
              to: `/auth/${options.defaultProvider}/logout`,
              statusCode: 302
            }
          });
        }
      }
    }
    if (isNonProductionEnvironment && options.devMode?.enabled) {
      logger.warn("Dev mode is enabled. Do not use in production!");
      logger.info("Dev mode OIDC discovery endpoint: /auth/dev/.well-known/openid-configuration");
      nuxt.options.nitro.storage = defu(nuxt.options.nitro.storage, {
        "oidc:dev": {
          driver: "fs",
          base: ".nuxt/oidc-dev"
        }
      });
      addServerPlugin(resolve("./runtime/server/plugins/devModeKeys"));
      addServerHandler({
        handler: resolve("./runtime/server/handler/dev"),
        route: "/auth/dev/login",
        method: "get"
      });
      addServerHandler({
        handler: resolve("./runtime/server/handler/logout.get"),
        route: "/auth/dev/logout",
        method: "get"
      });
      addServerHandler({
        handler: resolve("./runtime/server/handler/devDiscovery"),
        route: "/auth/dev/.well-known/openid-configuration",
        method: "get"
      });
      addServerHandler({
        handler: resolve("./runtime/server/handler/devJwks"),
        route: "/auth/dev/.well-known/jwks.json",
        method: "get"
      });
    }
    providers.forEach((provider) => {
      const providerConfig = options.providers[provider];
      const baseUrl = process.env[`NUXT_OIDC_PROVIDERS_${provider.toUpperCase()}_BASE_URL`] || providerConfig.baseUrl || providerPresets[provider].baseUrl;
      if (baseUrl) {
        let _baseUrl = baseUrl;
        const placeholders = baseUrl.matchAll(PLACEHOLDER_RE);
        for (const placeholderMatch of placeholders) {
          const placeholderKey = placeholderMatch[1];
          if (!placeholderKey) {
            continue;
          }
          if (Object.hasOwn(providerConfig, placeholderKey)) {
            const placeholderValue = providerConfig[placeholderKey];
            if (placeholderValue !== void 0 && typeof placeholderValue !== "object") {
              _baseUrl = _baseUrl.replace(`{${placeholderKey}}`, String(placeholderValue));
            }
          }
        }
        providerConfig.authorizationUrl = generateProviderUrl(
          _baseUrl,
          providerPresets[provider].authorizationUrl
        );
        providerConfig.tokenUrl = generateProviderUrl(
          _baseUrl,
          providerPresets[provider].tokenUrl
        );
        if (providerPresets[provider].userInfoUrl && !providerPresets[provider].userInfoUrl.startsWith("https"))
          providerConfig.userInfoUrl = generateProviderUrl(
            _baseUrl,
            providerPresets[provider].userInfoUrl
          );
        if (providerPresets[provider].logoutUrl)
          providerConfig.logoutUrl = generateProviderUrl(
            _baseUrl,
            providerPresets[provider].logoutUrl
          );
      }
      replaceInjectedParameters(["clientId"], providerConfig, providerPresets[provider], provider);
      addServerHandler({
        handler: resolve("./runtime/server/handler/login.get"),
        route: `/auth/${provider}/login`,
        method: "get"
      });
      addServerHandler({
        handler: resolve("./runtime/server/handler/callback"),
        route: `/auth/${provider}/callback`,
        method: "get"
      });
      addServerHandler({
        handler: resolve("./runtime/server/handler/callback"),
        route: `/auth/${provider}/callback`,
        method: "post"
      });
      addServerHandler({
        handler: resolve("./runtime/server/handler/logout.get"),
        route: `/auth/${provider}/logout`,
        method: "get"
      });
    });
    if (!nuxt.options._prepare)
      logger.success(`Registered ${providers.length} OIDC providers: ${providers.join(", ")}`);
    if (options.middleware.globalMiddlewareEnabled) {
      addRouteMiddleware({
        name: "00.auth.global",
        path: resolve("runtime/middleware/oidcAuth"),
        global: true
      });
    }
    if (providers.some((provider) => options.providers[provider]?.sessionConfiguration?.singleSignOut)) {
      addPlugin(resolve("./runtime/plugins/sso.client"));
      addServerHandler({
        handler: resolve("./runtime/server/api/sso"),
        route: "/api/_auth/sso",
        method: "get"
      });
    }
    if (options.devtools) setupDevToolsUI(nuxt, createResolver(import.meta.url));
    nuxt.options.runtimeConfig.oidc = defu(
      nuxt.options.runtimeConfig.oidc,
      {
        ...options
      }
    );
  }
});

export { module$1 as default };
