import type { JWK } from 'jose';
interface StoredKeyPair {
    privateKey: JWK;
    publicKey: JWK;
    kid: string;
}
export declare function getOrCreateDevModeKeyPair(): Promise<StoredKeyPair>;
export declare function getDevModeJwks(): Promise<{
    keys: JWK[];
}>;
export declare function clearDevModeKeys(): Promise<void>;
export declare function clearDevModeKeysCache(): void;
export {};
