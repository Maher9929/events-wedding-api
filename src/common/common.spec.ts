import { filterContactInfo } from './content-filter';
import { maskProviderData, maskEmail, maskPhone } from './data-masking';

// ─── Content Filter ────────────────────────────────────────────────────────
describe('filterContactInfo', () => {
  it('should block phone numbers', () => {
    const result = filterContactInfo('Call me at +974 5555 1234');
    expect(result.wasFiltered).toBe(true);
    expect(result.filteredTypes).toContain('phone');
    expect(result.content).not.toContain('5555');
  });

  it('should block email addresses', () => {
    const result = filterContactInfo('Email me at test@example.com please');
    expect(result.wasFiltered).toBe(true);
    expect(result.filteredTypes).toContain('email');
    expect(result.content).not.toContain('test@example.com');
  });

  it('should block social media links', () => {
    const result = filterContactInfo('Check my instagram.com/mypage');
    expect(result.wasFiltered).toBe(true);
    expect(result.filteredTypes).toContain('social_link');
    expect(result.content).not.toContain('instagram.com');
  });

  it('should not filter clean content', () => {
    const result = filterContactInfo('I need a photographer for my wedding');
    expect(result.wasFiltered).toBe(false);
    expect(result.filteredTypes).toHaveLength(0);
    expect(result.content).toBe('I need a photographer for my wedding');
  });

  it('should block whatsapp keyword + number combo', () => {
    const result = filterContactInfo('واتساب +974 5555 1234');
    expect(result.wasFiltered).toBe(true);
    expect(result.content).not.toContain('5555');
  });

  it('should handle multiple violation types in one string', () => {
    const result = filterContactInfo(
      'Email test@mail.com or call +974 1234 5678 or whatsapp',
    );
    expect(result.wasFiltered).toBe(true);
    expect(result.filteredTypes.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Data Masking ──────────────────────────────────────────────────────────
describe('maskProviderData', () => {
  it('should mask website and social_media', () => {
    const data = {
      id: 'p1',
      company_name: 'Test Co',
      website: 'https://test.com',
      social_media: { instagram: '@test' },
    };

    const masked = maskProviderData(data);
    expect(masked.website).toBeUndefined();
    expect(masked.social_media).toBeUndefined();
    expect(masked.company_name).toBe('Test Co');
  });

  it('should mask user_profiles email', () => {
    const data = {
      id: 'p1',
      user_profiles: { id: 'u1', full_name: 'Ahmed', email: 'ahmed@test.com' },
    };

    const masked = maskProviderData(data);
    expect(masked.user_profiles.email).not.toBe('ahmed@test.com');
    expect(masked.user_profiles.email).toContain('@test.com');
    expect(masked.user_profiles.full_name).toBe('Ahmed');
  });

  it('should not mutate original object', () => {
    const data = { id: 'p1', website: 'https://site.com' };
    maskProviderData(data);
    expect(data.website).toBe('https://site.com');
  });
});

describe('maskEmail', () => {
  it('should mask middle characters', () => {
    expect(maskEmail('ahmed@test.com')).toBe('a***d@test.com');
  });

  it('should handle short local part', () => {
    expect(maskEmail('ab@test.com')).toBe('**@test.com');
  });

  it('should handle invalid input', () => {
    expect(maskEmail('')).toBe('***');
    expect(maskEmail('noemail')).toBe('***');
  });
});

describe('maskPhone', () => {
  it('should mask middle digits', () => {
    const result = maskPhone('+97455551234');
    expect(result.startsWith('+97')).toBe(true);
    expect(result.endsWith('34')).toBe(true);
    expect(result).toContain('*');
  });

  it('should handle short input', () => {
    expect(maskPhone('12')).toBe('***');
  });
});
