import { defineEventHandler } from "h3";
import { getUserSession, refreshUserSession, sessionHooks } from "../utils/session.js";
export default defineEventHandler(async (event) => {
  try {
    let session = await getUserSession(event);
    if (session) {
      if (!session.updatedAt || session.updatedAt < Date.now() / 1e3 - 100) {
        session = await refreshUserSession(event);
      }
      await sessionHooks.callHookParallel("refresh", session, event);
      return session;
    }
  } catch {
    return {};
  }
});
