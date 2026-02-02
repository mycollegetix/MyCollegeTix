/**
 * Email domain validation for OAuth authentication
 * Only allows users from supported colleges and test accounts
 */

// Supported college email domains
const ALLOWED_DOMAINS = [
  'msu.edu',      // Michigan State University
  'umich.edu',    // University of Michigan
];

// Test accounts loaded from environment variable (more secure than hardcoding)
// Format: comma-separated list of emails
const getTestEmails = (): string[] => {
  const envEmails = process.env.EXPO_PUBLIC_ALLOWED_TEST_EMAILS;
  if (!envEmails) {
    return [];
  }
  return envEmails.split(',').map(email => email.trim().toLowerCase());
};

const ALLOWED_TEST_EMAILS = getTestEmails();

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

  // Special case: Allow specific Gmail test accounts
  if (domain === 'gmail.com') {
    return ALLOWED_TEST_EMAILS.includes(emailLower);
  }

  // Check if domain is in allowed college domains
  return ALLOWED_DOMAINS.includes(domain);
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
