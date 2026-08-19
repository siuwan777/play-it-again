let cachedEmail: string | null = null;

export function setAuthEmail(email: string) {
  cachedEmail = email.trim().toLowerCase();
}

export function getAuthEmail(): string | null {
  return cachedEmail;
}

export function clearAuthEmail() {
  cachedEmail = null;
}
