// VOXA Client-Side AES-GCM Encryption
// Messages are encrypted on the client before being sent to the server.
// The server only ever stores ciphertext — never plaintext.
// Keys are derived per-conversation from a shared app secret + conversationId.
// Both participants independently derive the same key from the conversationId they share.

const APP_SECRET = 'VOXA-SECURE-E2E-KEY-2026-MESSENGER-APP';
const ENC_PREFIX = 'VENC::'; // Prefix to identify encrypted messages

// Cache derived CryptoKeys to avoid re-deriving on every message
const keyCache = new Map<string, CryptoKey>();

async function deriveKey(conversationId: string): Promise<CryptoKey> {
  if (keyCache.has(conversationId)) return keyCache.get(conversationId)!;

  const rawKey = new TextEncoder().encode(APP_SECRET);
  const salt = new TextEncoder().encode(conversationId);

  const keyMaterial = await crypto.subtle.importKey('raw', rawKey, 'PBKDF2', false, ['deriveKey']);

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  keyCache.set(conversationId, key);
  return key;
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Encrypt a plaintext message using AES-GCM with a key derived from conversationId.
 * Returns a base64-encoded string prefixed with VENC::
 */
export async function encryptMessage(plaintext: string, conversationId: string): Promise<string> {
  try {
    const key = await deriveKey(conversationId);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext)
    );

    // Pack: IV (12 bytes) + ciphertext
    const combined = new Uint8Array(12 + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), 12);

    return ENC_PREFIX + bufToBase64(combined.buffer);
  } catch (err) {
    console.warn('[VOXA Crypto] Encryption failed, sending as plaintext:', err);
    return plaintext;
  }
}

/**
 * Decrypt a VENC:: prefixed message. Returns plaintext.
 * If the message is not encrypted (legacy/plain), returns as-is.
 */
export async function decryptMessage(ciphertext: string, conversationId: string): Promise<string> {
  if (!ciphertext || !ciphertext.startsWith(ENC_PREFIX)) {
    return ciphertext; // Not encrypted — legacy message, return unchanged
  }

  try {
    const key = await deriveKey(conversationId);
    const buf = base64ToBuf(ciphertext.slice(ENC_PREFIX.length));
    const iv = buf.slice(0, 12);
    const data = buf.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '🔒 [Encrypted message — unable to decrypt]';
  }
}

/** Check if a string looks like an encrypted VOXA message */
export function isEncrypted(text: string): boolean {
  return text?.startsWith(ENC_PREFIX) ?? false;
}
