/**
 * Masks sensitive contact information from provider/user data
 * for public or pre-confirmation contexts.
 */
export function maskProviderData(
  data: Record<string, any>,
): Record<string, any> {
  const masked = { ...data };

  // Mask provider-level fields
  if ('website' in masked) masked.website = undefined;
  if ('social_media' in masked) masked.social_media = undefined;

  // Mask joined user_profiles
  if (
    masked.user_profiles &&
    typeof masked.user_profiles === 'object' &&
    !Array.isArray(masked.user_profiles)
  ) {
    const profile = { ...masked.user_profiles };
    if ('email' in profile) profile.email = maskEmail(profile.email as string);
    if ('phone' in profile) profile.phone = '***';
    masked.user_profiles = profile;
  }

  return masked;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `**@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '***';
  return phone.slice(0, 3) + '*'.repeat(phone.length - 5) + phone.slice(-2);
}
