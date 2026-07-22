/**
 * DPoP (Demonstrating Proof-of-Possession at the Application Layer, RFC 9449) support.
 *
 * Nocodeworks BFF-native design:
 *   - Keypair is generated on the Nitro server (never in the browser).
 *   - Private key is exported as JWK, then AES-GCM encrypted with NUXT_OIDC_TOKEN_KEY
 *     (the same key used for access_token at-rest encryption) and stored inside
 *     PersistentSession in Nitro storage (Upstash Redis in Stage/Prod, memory in dev).
 *   - Public key JWK and RFC 7638 thumbprint (`jkt`) are stored unencrypted (non-secret).
 *   - Each DPoP proof JWT is signed on Nitro on demand; the private key never leaves
 *     server memory and never touches the browser.
 *
 * See RFC 9449 §4 (Proof JWT), §5 (cnf claim), §6 (Resource server access), §11 (Security).
 */
import type { JWK } from 'jose';
import type { EncryptedToken } from './security.js';
/** RFC 9449 §4.2 — JOSE header `typ` for DPoP proofs. */
export declare const DPOP_JWT_TYP = "dpop+jwt";
/** RFC 9449 §4.2 — signature algorithm used for Nocodeworks DPoP proofs. */
export declare const DPOP_ALG = "ES256";
/**
 * A DPoP keypair as persisted in a BFF session.
 *
 *  - `encryptedPrivateKey`: JWK-serialized ECDSA P-256 private key, encrypted with
 *    NUXT_OIDC_TOKEN_KEY (AES-GCM). Decrypted only inside Nitro when signing a proof.
 *  - `publicKeyJWK`: the public half in JWK form. Embedded verbatim in the proof
 *    JWT's `jwk` protected header so the resource server can verify without discovery.
 *  - `jkt`: RFC 7638 SHA-256 thumbprint of `publicKeyJWK` (base64url).
 *    Sent to the authorization server via the initial DPoP proof; the AS embeds it
 *    as `cnf.jkt` in the access token so resource servers can bind the token to
 *    this keypair.
 */
export interface DPoPKeypair {
    encryptedPrivateKey: EncryptedToken;
    publicKeyJWK: JWK;
    jkt: string;
}
/** Options for signing a DPoP proof JWT. */
export interface DPoPProofOptions {
    /** HTTP method — will be uppercased per RFC 9449 §4.2. */
    htm: string;
    /**
     * Target URI without query or fragment (per RFC 9449 §4.2). Callers must pass the
     * outbound URL exactly as it will appear on the wire; use `buildHtu` for consistency.
     */
    htu: string;
    /**
     * base64url(SHA-256(access_token)) — required when the proof accompanies an
     * access token on a resource-server request (RFC 9449 §4.2, §6.1). Omit for
     * the initial proof sent to the authorization server's token endpoint.
     */
    ath?: string;
    /** Optional server-issued nonce (RFC 9449 §8) — Nocodeworks does not require it. */
    nonce?: string;
}
/**
 * Generates a fresh ES256 keypair, encrypts the private half at rest, and returns
 * the material a BFF session needs to sign and bind future DPoP proofs.
 *
 * @param tokenKey  Base64-encoded 256-bit AES-GCM key (= `NUXT_OIDC_TOKEN_KEY`).
 */
export declare function generateDPoPKeypair(tokenKey: string): Promise<DPoPKeypair>;
/**
 * Signs a DPoP proof JWT (RFC 9449 §4.2).
 *
 * Header: `{ typ: "dpop+jwt", alg: "ES256", jwk: <publicKeyJWK> }`
 * Payload: `{ jti, htm, htu, iat[, ath][, nonce] }`
 *
 * @param encryptedPrivateKey  Encrypted JWK-serialized private key from
 *                             {@link generateDPoPKeypair}.
 * @param publicKeyJWK         Public key JWK; embedded verbatim in the JOSE header.
 * @param tokenKey             Base64-encoded 256-bit AES-GCM key used to decrypt.
 * @param options              `htm` + `htu` always required; `ath` when calling a
 *                             resource server.
 */
export declare function generateDPoPProof(encryptedPrivateKey: EncryptedToken, publicKeyJWK: JWK, tokenKey: string, options: DPoPProofOptions): Promise<string>;
/**
 * Computes `ath` per RFC 9449 §4.2 / §6.1: base64url(SHA-256(access_token)).
 * Required on every DPoP proof that accompanies an access token to a resource server.
 */
export declare function computeAth(accessToken: string): Promise<string>;
/**
 * Canonicalizes a URL for the `htu` claim per RFC 9449 §4.2: scheme + authority + path,
 * no query, no fragment. Preserves default ports as omitted.
 */
export declare function buildHtu(url: string | URL): string;
