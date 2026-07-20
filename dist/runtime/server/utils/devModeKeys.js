import { exportJWK, generateKeyPair } from "jose";
import { useStorage } from "nitropack/runtime";
let cachedKeyPair = null;
function generateKid() {
  return `dev-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}
export async function getOrCreateDevModeKeyPair() {
  if (cachedKeyPair) {
    return cachedKeyPair;
  }
  const storage = useStorage("oidc:dev");
  const stored = await storage.getItem("keypair");
  if (stored) {
    cachedKeyPair = stored;
    return stored;
  }
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  const kid = generateKid();
  const privateJwk = await exportJWK(privateKey);
  const publicJwk = await exportJWK(publicKey);
  privateJwk.kid = kid;
  privateJwk.alg = "RS256";
  privateJwk.use = "sig";
  publicJwk.kid = kid;
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  const keyPair = {
    privateKey: privateJwk,
    publicKey: publicJwk,
    kid
  };
  await storage.setItem("keypair", keyPair);
  cachedKeyPair = keyPair;
  return keyPair;
}
export async function getDevModeJwks() {
  const keyPair = await getOrCreateDevModeKeyPair();
  return {
    keys: [keyPair.publicKey]
  };
}
export async function clearDevModeKeys() {
  const storage = useStorage("oidc:dev");
  await storage.removeItem("keypair");
  cachedKeyPair = null;
}
export function clearDevModeKeysCache() {
  cachedKeyPair = null;
}
