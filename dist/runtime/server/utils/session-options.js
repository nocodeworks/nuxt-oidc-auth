export function resolveMissingPersistentSessionMode(providerSessionConfig, userSession) {
  if (userSession.singleSignOut) {
    return "clear";
  }
  const configuredMode = providerSessionConfig?.missingPersistentSession;
  if (configuredMode === "warn" || configuredMode === "silent" || configuredMode === "clear") {
    return configuredMode;
  }
  return "clear";
}
