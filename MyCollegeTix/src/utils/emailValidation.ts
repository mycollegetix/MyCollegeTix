/**
 * Email domain validation for OAuth authentication
 * Only allows users from supported colleges and test accounts
 */

// Supported college email domains
const ALLOWED_DOMAINS = [
  'msu.edu',      // Michigan State University
  'umich.edu',    // University of Michigan
  'gmail.com',    // Gmail (restricted to test accounts only)
];

// Test accounts (only for gmail.com domain)
const ALLOWED_TEST_EMAILS = [
  'aditi.dron@gmail.com',
  'agarwal.vijay@gmail.com',
  'cotejosephr@gmail.com',
  'dinguspickle07@gmail.com',
  'mycollegetix+2@gmail.com',
  'mycollegetix@gmail.com',
  'nikhilmamtani@gmail.com',
  'nikhilmamtani6@gmail.com',
  'riyamathur2014@gmail.com',
  'rohanm.0304@gmail.com',
  'smithhhannee@gmail.com',
  'vivekapatel2005@gmail.com',
];

/**
 * Validates if an email is allowed to access the application
 * @param email - The email address to validate
 * @returns true if email is allowed, false otherwise
 */
export function isEmailAllowed(email: string): boolean {
  if (!email) {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split('@')[1];

  if (!domain) {
    return false;
  }

  // Check if domain is in allowed list
  if (!ALLOWED_DOMAINS.includes(domain)) {
    return false;
  }

  // For gmail.com, must be in the test account list
  if (domain === 'gmail.com') {
    return ALLOWED_TEST_EMAILS.includes(emailLower);
  }

  // All other allowed domains are accepted
  return true;
}

/**
 * Gets a user-friendly error message for unauthorized emails
 * @param email - The email that was rejected
 * @returns Error message explaining why access was denied
 */
export function getEmailDeniedMessage(email: string): string {
  if (!email) {
    return 'No email address provided';
  }

  const domain = email.toLowerCase().split('@')[1];

  if (domain === 'gmail.com') {
    return 'Access is currently limited to authorized test accounts. Please use your college email (.edu) to sign up.';
  }

  return 'Access is currently limited to students from Michigan State University and University of Michigan. Please use your college email address.';
}
