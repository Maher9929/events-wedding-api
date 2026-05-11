type EnvConfig = Record<string, string | undefined>;

const PRODUCTION_REQUIRED_KEYS = [
  'ALLOWED_ORIGINS',
  'APP_BASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
] as const;

const URL_KEYS = ['SUPABASE_URL', 'APP_BASE_URL', 'SENTRY_DSN'] as const;

function isPlaceholder(value?: string): boolean {
  const trimmed = value?.trim();

  if (!trimmed) {
    return true;
  }

  const normalized = trimmed.toLowerCase();

  return (
    normalized.includes('xxx') ||
    normalized.includes('your_') ||
    normalized.includes('changeme') ||
    normalized.includes('change_me') ||
    normalized === 'placeholder-key'
  );
}

function addMissingError(errors: string[], key: string) {
  errors.push(`${key} is required and must not be a placeholder value.`);
}

function validateUrl(errors: string[], key: string, value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return;
  }

  try {
    new URL(trimmed);
  } catch {
    errors.push(`${key} must be a valid URL.`);
  }
}

function validateAllowedOrigins(errors: string[], value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return;
  }

  const origins = trimmed
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of origins) {
    validateUrl(errors, 'ALLOWED_ORIGINS', origin);
  }
}

export function validateEnv(config: EnvConfig): EnvConfig {
  const errors: string[] = [];
  const nodeEnv = config.NODE_ENV || 'development';
  const isTest = nodeEnv === 'test';
  const isProduction = nodeEnv === 'production';

  if (isTest) {
    return config;
  }

  if (isPlaceholder(config.JWT_SECRET)) {
    addMissingError(errors, 'JWT_SECRET');
  }

  const jwtSecret = config.JWT_SECRET?.trim();

  if (jwtSecret && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long.');
  }

  if (isPlaceholder(config.SUPABASE_URL)) {
    addMissingError(errors, 'SUPABASE_URL');
  }

  if (
    isPlaceholder(config.SUPABASE_SERVICE_ROLE_KEY) &&
    isPlaceholder(config.SUPABASE_ANON_KEY)
  ) {
    errors.push(
      'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required and must not be a placeholder value.',
    );
  }

  for (const key of URL_KEYS) {
    validateUrl(errors, key, config[key]);
  }

  validateAllowedOrigins(errors, config.ALLOWED_ORIGINS);

  if (isProduction) {
    for (const key of PRODUCTION_REQUIRED_KEYS) {
      if (isPlaceholder(config[key])) {
        addMissingError(errors, key);
      }
    }

    if (isPlaceholder(config.SUPABASE_SERVICE_ROLE_KEY)) {
      addMissingError(errors, 'SUPABASE_SERVICE_ROLE_KEY');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n- ${errors.join('\n- ')}`,
    );
  }

  return config;
}
