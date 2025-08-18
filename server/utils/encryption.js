const crypto = require('crypto');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }

  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Encrypt sensitive user data
function encryptUserData(data) {
  const sensitiveFields = ['ssn', 'passportNumber', 'driversLicense', 'medicalHistory'];
  const encrypted = { ...data };
  
  sensitiveFields.forEach(field => {
    if (data[field]) {
      encrypted[field] = encrypt(data[field]);
    }
  });
  
  return encrypted;
}

// Decrypt sensitive user data
function decryptUserData(data) {
  const sensitiveFields = ['ssn', 'passportNumber', 'driversLicense', 'medicalHistory'];
  const decrypted = { ...data };
  
  sensitiveFields.forEach(field => {
    if (data[field] && typeof data[field] === 'string' && data[field].includes(':')) {
      try {
        decrypted[field] = decrypt(data[field]);
      } catch (error) {
        console.error(`Error decrypting field ${field}:`, error);
        decrypted[field] = data[field]; // Keep original if decryption fails
      }
    }
  });
  
  return decrypted;
}

// Generate a secure random key
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash sensitive data (one-way encryption)
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Verify hash
function verifyHash(data, hash) {
  return hashData(data) === hash;
}

module.exports = { 
  encrypt, 
  decrypt, 
  encryptUserData, 
  decryptUserData, 
  generateEncryptionKey, 
  hashData, 
  verifyHash 
};

