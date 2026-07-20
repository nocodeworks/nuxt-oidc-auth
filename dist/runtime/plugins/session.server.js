import { defineNuxtPlugin, useOidcAuth } from "#imports";
export default defineNuxtPlugin({
  name: "session-fetch-plugin",
  enforce: "pre",
  async setup(nuxt) {
    if (nuxt.payload.serverRendered) {
      await useOidcAuth().fetch();
    }
  }
});
