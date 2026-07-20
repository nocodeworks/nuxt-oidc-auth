function normalizeBase64(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - normalized.length % 4) % 4;
  return normalized.padEnd(normalized.length + paddingLength, "=");
}
function encodeBase64(bytes, options = {}) {
  let base64;
  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    base64 = btoa(binary);
  }
  if (options.urlSafe) {
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  return base64;
}
function decodeBase64(input) {
  const normalized = normalizeBase64(input);
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(normalized, "base64"));
  }
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
export function textToBase64(text, options = {}) {
  return encodeBase64(new TextEncoder().encode(text), options);
}
export function arrayBufferToBase64(buffer, options = {}) {
  return encodeBase64(new Uint8Array(buffer), options);
}
export function base64ToText(input, _options = {}) {
  return new TextDecoder().decode(decodeBase64(input));
}
export function base64ToUint8Array(input) {
  return decodeBase64(input);
}
export function uint8ArrayToBase64(input, options = {}) {
  return encodeBase64(input, options);
}
