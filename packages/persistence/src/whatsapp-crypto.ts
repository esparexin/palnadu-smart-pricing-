import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const DEFAULT_FALLBACK_KEY = 'palnadu-smart-pricing-secret-32b!'; // 32 bytes

function resolveKey(customKey?: string): Buffer {
  const source = customKey || process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY;
  if (!source) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'WhatsApp encryption key is not configured. Set SESSION_SECRET or ENCRYPTION_KEY in production.',
      );
    }
    return createHmac('sha256', 'palnadu-salt').update(DEFAULT_FALLBACK_KEY).digest();
  }
  return createHmac('sha256', 'palnadu-salt').update(source).digest();
}

export function encryptSecret(plaintext: string, customKey?: string): string {
  const key = resolveKey(customKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(encryptedPayload: string, customKey?: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const key = resolveKey(customKey);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString('utf8');
}

export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader: string | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  const prefix = 'sha256=';
  if (!signatureHeader.startsWith(prefix)) {
    return false;
  }

  const expectedSignature = signatureHeader.slice(prefix.length).trim();
  const computedSignature = createHmac('sha256', appSecret).update(rawBody).digest('hex');

  if (expectedSignature.length !== computedSignature.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(computedSignature, 'hex'),
    );
  } catch {
    return false;
  }
}
