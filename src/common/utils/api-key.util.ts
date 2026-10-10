import crypto from 'node:crypto';

export interface GeneratedApiKey {
  rawKey: string;
  prefix: string;
  keyHash: string;
}

/**
 * Generates a cryptographically secure API Key.
 * Format: vod_[live|test]_[24-byte-hex-random]
 */
export function generateApiKey(environment: 'live' | 'test' = 'live'): GeneratedApiKey {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `vod_${environment}_${randomBytes}`;
  const prefix = rawKey.slice(0, 16);
  const keyHash = hashApiKey(rawKey);

  return {
    rawKey,
    prefix,
    keyHash,
  };
}

/**
 * Hashes a raw API key using SHA-256 for secure DB lookup and storage.
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}
