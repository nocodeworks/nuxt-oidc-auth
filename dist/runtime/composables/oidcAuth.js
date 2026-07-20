import {
  computed,
  navigateTo,
  useRequestEvent,
  useRequestFetch,
  useRuntimeConfig,
  useState
} from "#imports";
import { appendResponseHeader } from "h3";
import { withBase } from "ufo";
export function useOidcAuth() {
  const sessionState = useState("nuxt-oidc-auth-session", void 0);
  const user = computed(() => sessionState.value ?? void 0);
  const loggedIn = computed(() => {
    return Boolean(sessionState.value?.expireAt);
  });
  const currentProvider = computed(
    () => sessionState.value?.provider || void 0
  );
  const serverEvent = import.meta.server ? useRequestEvent() : null;
  async function fetch() {
    sessionState.value = await useRequestFetch()("/api/_auth/session", {
      headers: {
        Accept: "text/json"
      }
    }).catch(() => void 0);
  }
  async function refresh() {
    const currentProvider2 = sessionState.value?.provider || void 0;
    sessionState.value = await useRequestFetch()("/api/_auth/refresh", {
      headers: {
        Accept: "text/json"
      },
      method: "POST"
    }).catch(() => login());
    if (!loggedIn.value) {
      await logout(currentProvider2);
    }
  }
  async function login(provider, params) {
    const baseURL = useRuntimeConfig().app.baseURL || "/";
    const queryParams = params ? `?${new URLSearchParams(params).toString()}` : "";
    const loginPath = `/auth${provider ? `/${provider}` : ""}/login${queryParams}`;
    await navigateTo(withBase(loginPath, baseURL), { external: true, redirectCode: 302 });
  }
  async function logout(provider, logoutRedirectUri) {
    const baseURL = useRuntimeConfig().app.baseURL || "/";
    const logoutPath = `/auth${provider ? `/${provider}` : currentProvider.value ? `/${currentProvider.value}` : ""}/logout${logoutRedirectUri ? `?logout_redirect_uri=${logoutRedirectUri}` : ""}`;
    await navigateTo(withBase(logoutPath, baseURL), { external: true, redirectCode: 302 });
    if (sessionState.value) {
      sessionState.value = void 0;
    }
  }
  async function clear() {
    await useRequestFetch()("/api/_auth/session", {
      method: "DELETE",
      headers: {
        Accept: "text/json"
      },
      onResponse({ response: { headers } }) {
        if (import.meta.server && serverEvent) {
          for (const setCookie of headers.getSetCookie()) {
            appendResponseHeader(serverEvent, "Set-Cookie", setCookie);
          }
        }
      }
    });
    if (sessionState.value) {
      sessionState.value = void 0;
    }
  }
  return {
    loggedIn,
    user,
    currentProvider,
    fetch,
    refresh,
    login,
    logout,
    clear
  };
}
