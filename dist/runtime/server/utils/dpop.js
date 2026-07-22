import { calculateJwkThumbprint, exportJWK, generateKeyPair, importJWK, SignJWT } from "jose";
import { decryptToken, encryptToken } from "./security.js";
import { arrayBufferToBase64 } from "./encoding.js";
export const DPOP_JWT_TYP = "dpop+jwt";
export const DPOP_ALG = "ES256";
export async function generateDPoPKeypair(tokenKey) {
  const { publicKey, privateKey } = await generateKeyPair(DPOP_ALG, { extractable: true });
  const publicKeyJWK = await exportJWK(publicKey);
  const privateKeyJWK = await exportJWK(privateKey);
  const encryptedPrivateKey = await encryptToken(JSON.stringify(privateKeyJWK), tokenKey);
  const jkt = await calculateJwkThumbprint(publicKeyJWK, "sha256");
  return { encryptedPrivateKey, publicKeyJWK, jkt };
}
export async function generateDPoPProof(encryptedPrivateKey, publicKeyJWK, tokenKey, options) {
  const privateKeyJson = await decryptToken(encryptedPrivateKey, tokenKey);
  const privateKeyJWK = JSON.parse(privateKeyJson);
  const privateKey = await importJWK(privateKeyJWK, DPOP_ALG);
  const payload = {
    jti: globalThis.crypto.randomUUID(),
    htm: options.htm.toUpperCase(),
    htu: options.htu,
    iat: Math.trunc(Date.now() / 1e3)
  };
  if (options.ath) payload.ath = options.ath;
  if (options.nonce) payload.nonce = options.nonce;
  return await new SignJWT(payload).setProtectedHeader({
    typ: DPOP_JWT_TYP,
    alg: DPOP_ALG,
    jwk: publicKeyJWK
  }).sign(privateKey);
}
export async function computeAth(accessToken) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(accessToken)
  );
  return arrayBufferToBase64(digest, { urlSafe: true, dataURL: false });
}
export function buildHtu(url) {
  const u = typeof url === "string" ? new URL(url) : url;
  return `${u.origin}${u.pathname}`;
}
