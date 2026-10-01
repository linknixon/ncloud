import crypto from 'node:crypto';
import QRCode from 'qrcode';

const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Base32 encodes a Buffer into a standard RFC 4648 string (without padding)
 */
export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += RFC4648_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += RFC4648_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Base32 decodes a string into a Buffer
 */
export function base32Decode(input) {
  const cleaned = String(input || '').toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = RFC4648_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 TOTP secret key (20 bytes = 32 base32 characters)
 */
export function generateTOTPSecret() {
  return base32Encode(crypto.randomBytes(20));
}

/**
 * Generates a 6-digit TOTP code for a given secret at current time (+/- step offset)
 */
export function generateTOTPCode(secret, timeStepOffset = 0) {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30) + timeStepOffset;
  const timeBuf = Buffer.alloc(8);
  timeBuf.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key).update(timeBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(codeInt % 1000000).padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP token against a secret with +/- 1 step window (60s drift)
 */
export function verifyTOTPToken(secret, token, window = 1) {
  if (!secret || !token) return false;
  const cleanToken = String(token).replace(/\s+/g, '').trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  for (let i = -window; i <= window; i++) {
    if (generateTOTPCode(secret, i) === cleanToken) {
      return true;
    }
  }
  return false;
}

/**
 * Generates an otpauth:// URI and high-res QR Code Data URL for Authenticator Apps
 */
export async function generateTOTPSetupData(userEmail, secret, issuer = 'Nova Cloud') {
  const cleanEmail = String(userEmail || 'user@ncloud.co.ug').trim();
  const cleanSecret = String(secret || '').trim();
  const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(cleanEmail)}?secret=${cleanSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
    margin: 1,
    width: 240,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });

  return {
    secret: cleanSecret,
    otpauth_uri: otpauthUri,
    qr_code: qrCodeDataUrl
  };
}
