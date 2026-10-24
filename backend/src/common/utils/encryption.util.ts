import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Derives a 32-byte Buffer key from the required ENCRYPTION_SECRET.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('replace-with')) {
    throw new Error('ENCRYPTION_SECRET must be configured with at least 32 non-placeholder characters.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Output format: iv:authTag:ciphertext (hex-encoded)
 */
export function encryptData<T = any>(data: T): string {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an encrypted string payload back into the original data.
 */
export function decryptData<T = any>(encryptedPayload: string): T {
  const [ivHex, authTagHex, encryptedHex] = encryptedPayload.split(':');

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted payload format.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const decryptedText = decrypted.toString('utf8');

  try {
    return JSON.parse(decryptedText);
  } catch {
    return decryptedText as unknown as T;
  }
}

/**
 * Utility to mask secret credential fields for dashboard display.
 * e.g., "SG.9f8a7b6c5d4e3f2a" -> "SG.9f8...3f2a"
 */
export function maskSensitiveValue(value: string): string {
  if (!value || typeof value !== 'string') return '****';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
