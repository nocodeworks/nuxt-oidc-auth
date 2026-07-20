import { defineEventHandler } from "h3";
import { getUserSession, sessionHooks } from "../utils/session.js";
export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event);
    await sessionHooks.callHookParallel("fetch", session, event);
    return session || {};
  } catch {
    return {};
  }
});
