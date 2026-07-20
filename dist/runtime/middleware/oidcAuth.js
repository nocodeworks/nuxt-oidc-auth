import { defineNuxtRouteMiddleware, useOidcAuth, useRuntimeConfig } from "#imports";
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.oidcAuth?.enabled === false) {
    return;
  }
  const isErrorPage = !(to.matched.length > 0);
  if (isErrorPage) {
    return;
  }
  const { loggedIn, login } = useOidcAuth();
  if (loggedIn.value === true || to.path.startsWith("/auth/")) {
    return;
  }
  if (useRuntimeConfig().oidc.middleware?.redirect === false) {
    return;
  }
  await login(void 0, { callbackRedirectUrl: to.fullPath });
});
