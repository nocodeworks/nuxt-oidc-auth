export function sanitizeCallbackRedirectUrl(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return void 0;
  }
  return value;
}
export function resolveCallbackRedirectUrl({
  configuredCallbackRedirectUrl,
  hasConfiguredCallbackRedirectUrl,
  sessionCallbackRedirectUrl
}) {
  if (hasConfiguredCallbackRedirectUrl && configuredCallbackRedirectUrl) {
    return configuredCallbackRedirectUrl;
  }
  return sanitizeCallbackRedirectUrl(sessionCallbackRedirectUrl) || configuredCallbackRedirectUrl || "/";
}
