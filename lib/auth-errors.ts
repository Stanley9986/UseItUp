export function getFriendlyAuthError(error: unknown, fallback: string) {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'That email or password does not match an account.';
  }

  if (message.includes('email not confirmed')) {
    return 'Confirm your email before logging in. Check your inbox for the Supabase confirmation link.';
  }

  if (message.includes('password should be at least') || message.includes('weak password')) {
    return 'Use a stronger password. Supabase requires at least 6 characters.';
  }

  if (message.includes('user already registered') || message.includes('already registered')) {
    return 'An account already exists for this email. Log in instead.';
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Wait a moment, then try again.';
  }

  return getErrorMessage(error) || fallback;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }

  return '';
}
