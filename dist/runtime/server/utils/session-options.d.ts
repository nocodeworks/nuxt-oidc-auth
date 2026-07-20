import type { ProviderSessionConfig, UserSession } from '../../types.js';
export type MissingPersistentSessionMode = 'clear' | 'warn' | 'silent';
export declare function resolveMissingPersistentSessionMode(providerSessionConfig: ProviderSessionConfig | undefined, userSession: Pick<UserSession, 'singleSignOut'>): MissingPersistentSessionMode;
