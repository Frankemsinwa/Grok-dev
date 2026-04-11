import crypto from 'crypto';

// In production, ENCRYPTION_KEY should be set in .env and be precisely 32 characters or handled via hash.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'grokdev-default-secure-key-32bts!'; 
const ALGORITHM = 'aes-256-cbc';

/**
 * Gets a valid 32-byte key from the environment variable.
 */
function getKey() {
  return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substring(0, 32);
}

export function encryptToken(text: string): string {
  if (!text) return text;
  
  // Create an initialization vector
  const iv = crypto.randomBytes(16);
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(getKey()), iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Return IV and encrypted text joined by a colon
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptToken(text: string): string {
  if (!text) return text;
  
  try {
    const textParts = text.split(':');
    
    // If it doesn't look like our encrypted format (no IV), assume it's legacy unencrypted
    if (textParts.length !== 2) return text;
    
    const iv = Buffer.from(textParts.shift() as string, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(getKey()), iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    // Fallback: If decryption fails, maybe it was a plain text token just containing a colon by chance
    console.warn('Decryption failed, falling back to raw token');
    return text;
  }
}
