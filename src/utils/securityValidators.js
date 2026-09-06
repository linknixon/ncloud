/**
 * Security validation utility for password policy
 * Enforces strong password criteria and blocks common weak passwords
 */

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'pass1234', 'p@ssword', 'p@ssw0rd',
  '123456', '1234567', '12345678', '123456789', '1234567890', '00000000', '11111111', '87654321',
  'qwerty', 'qwerty1', 'qwerty123', 'qwertz123', 'asdfghjk', 'zxcvbnm1',
  'admin', 'admin123', 'admin2024', 'admin2025', 'admin2026', 'administrator', 'root1234',
  'welcome', 'welcome1', 'welcome123', 'letmein1', 'iloveyou1', 'monkey123',
  'novacloud', 'novacloud123', 'ncloud123', 'ncloud2026', 'testing123', 'default123',
  'dragon123', 'master123', 'sunshine1', 'football1', 'secret123', 'login123'
]);

export function validatePasswordStrength(password, userEmail = '', userName = '') {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { isValid: false, error: 'Password must contain both letters and numbers for adequate security.' };
  }

  const clean = password.toLowerCase().trim();

  if (COMMON_PASSWORDS.has(clean)) {
    return { isValid: false, error: 'This password is too common and easily guessed. Please choose a more unique password.' };
  }

  // Detect common dictionary words with simple digit/symbol suffixes (e.g. admin12345, password2026, welcome99)
  const commonBasePattern = /^(password|passcode|admin|administrator|welcome|qwerty|letmein|novacloud|ncloud|changeme|guest|system|testing|default|portal)[0-9!@#$%^&*_\-.]*$/i;
  if (commonBasePattern.test(clean)) {
    return { isValid: false, error: 'This password is based on a common easily guessed word. Please choose a more unique password.' };
  }

  // Detect simple repeated character sequences (e.g. 11111111, aaaaaaaa)
  if (/^(.)\1+$/.test(clean) || /^(.{2,4})\1+$/.test(clean)) {
    return { isValid: false, error: 'Password contains repetitive patterns. Please choose a stronger password.' };
  }

  // Detect if password matches the email username
  if (userEmail && typeof userEmail === 'string') {
    const emailPrefix = userEmail.split('@')[0].toLowerCase().trim();
    if (emailPrefix.length >= 3 && (clean === emailPrefix || clean === emailPrefix + '123' || clean === emailPrefix + '1')) {
      return { isValid: false, error: 'Password cannot be derived from your email address.' };
    }
  }

  // Detect if password matches the user's name
  if (userName && typeof userName === 'string') {
    const cleanName = userName.toLowerCase().replace(/\s+/g, '');
    if (cleanName.length >= 3 && (clean === cleanName || clean === cleanName + '123' || clean === cleanName + '1')) {
      return { isValid: false, error: 'Password cannot be derived from your name.' };
    }
  }

  return { isValid: true };
}
