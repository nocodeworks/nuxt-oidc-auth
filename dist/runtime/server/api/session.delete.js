import { defineEventHandler } from "h3";
import { clearUserSession } from "../utils/session.js";
export default defineEventHandler(async (event) => {
  await clearUserSession(event);
  return { loggedOut: true };
});
