export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Normalizes an Indian mobile number input into its canonical 10-digit form (e.g. 9876543210).
 * Strips formatting characters, leading 0, or leading country code 91/+91.
 */
export function sanitizeMobile(raw: string, countryCode: string = '91'): string {
  const cleanCountry = countryCode.replace(/\D/g, '') || '91';
  const cleaned = raw.replace(/[\s\-().+]/g, '');

  if (cleaned.startsWith(cleanCountry) && cleaned.length === cleanCountry.length + 10) {
    return cleaned.slice(cleanCountry.length);
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Validates an Indian mobile number and returns it prefixed with the configured country code
 * (e.g. 919876543210) without duplicating the country code.
 */
export function normalizeMobileWithCountry(raw: string, countryCode: string = '91'): string {
  const cleanCountry = countryCode.replace(/\D/g, '') || '91';
  const tenDigit = sanitizeMobile(raw, cleanCountry);

  if (!INDIAN_MOBILE_REGEX.test(tenDigit)) {
    throw new Error('Please provide a valid 10-digit Indian mobile number.');
  }

  return `${cleanCountry}${tenDigit}`;
}
