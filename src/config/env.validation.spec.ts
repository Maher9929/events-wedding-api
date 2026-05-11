import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const validConfig = {
    NODE_ENV: 'development',
    JWT_SECRET: '0123456789abcdef0123456789abcdef',
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_ANON_KEY: 'supabase-anon-key',
  };

  it('accepts a valid development configuration', () => {
    expect(validateEnv(validConfig)).toBe(validConfig);
  });

  it('skips validation in test environment', () => {
    expect(validateEnv({ NODE_ENV: 'test' })).toEqual({ NODE_ENV: 'test' });
  });

  it('rejects missing required runtime secrets outside tests', () => {
    expect(() => validateEnv({ NODE_ENV: 'development' })).toThrow(
      /JWT_SECRET/,
    );
    expect(() => validateEnv({ NODE_ENV: 'development' })).toThrow(
      /SUPABASE_URL/,
    );
  });

  it('requires production-only deployment values', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        NODE_ENV: 'production',
      }),
    ).toThrow(/STRIPE_SECRET_KEY/);
  });
});
