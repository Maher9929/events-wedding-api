#!/usr/bin/env node

const { existsSync, readFileSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const isWindows = process.platform === 'win32';
const npmBin = 'npm';
const dockerBin = 'docker';

let failures = 0;

function hasFlag(flag) {
  return args.has(flag);
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

function pass(message) {
  log(`[OK] ${message}`);
}

function warn(message) {
  log(`[WARN] ${message}`);
}

function fail(message) {
  failures += 1;
  log(`[FAIL] ${message}`);
}

function section(title) {
  log(`\n== ${title} ==`);
}

function readEnvFile(relativePath) {
  const filePath = path.join(rootDir, relativePath);

  if (!existsSync(filePath)) {
    fail(`${relativePath} is missing.`);
    return {};
  }

  const env = {};
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalsIndex = line.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  pass(`${relativePath} found.`);
  return env;
}

function isPlaceholder(value) {
  if (!value || !value.trim()) {
    return true;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized.includes('xxx') ||
    normalized.includes('your_') ||
    normalized.includes('changeme') ||
    normalized.includes('change_me') ||
    normalized.includes('example.com') ||
    normalized === 'placeholder-key'
  );
}

function requireValues(env, relativePath, keys) {
  for (const key of keys) {
    if (isPlaceholder(env[key])) {
      fail(`${relativePath}: ${key} is missing or still uses a placeholder.`);
    } else {
      pass(`${relativePath}: ${key} is set.`);
    }
  }
}

function requireUrl(env, relativePath, key) {
  const value = env[key];

  if (isPlaceholder(value)) {
    return;
  }

  try {
    new URL(value);
    pass(`${relativePath}: ${key} is a valid URL.`);
  } catch {
    fail(`${relativePath}: ${key} must be a valid URL.`);
  }
}

function checkJwtSecret(env) {
  const value = env.JWT_SECRET;

  if (isPlaceholder(value)) {
    return;
  }

  if (value.trim().length < 32) {
    fail('.env: JWT_SECRET must be at least 32 characters long.');
  } else {
    pass('.env: JWT_SECRET length is acceptable.');
  }
}

function checkFile(relativePath) {
  if (existsSync(path.join(rootDir, relativePath))) {
    pass(`${relativePath} exists.`);
  } else {
    fail(`${relativePath} is missing.`);
  }
}

function runCommand(name, command, commandArgs, cwd = rootDir) {
  log(`\n$ ${[command, ...commandArgs].join(' ')}`);

  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: 'inherit',
    shell: isWindows,
  });

  if (result.error) {
    fail(`${name} could not start: ${result.error.message}`);
    return;
  }

  if (result.status !== 0) {
    fail(`${name} failed with exit code ${result.status}.`);
    return;
  }

  pass(`${name} passed.`);
}

section('Required files');
[
  '.env.example',
  '.env.production.example',
  'frontend/.env.example',
  'Dockerfile',
  'frontend/Dockerfile',
  'docker-compose.yml',
  'docker-compose.prod.yml',
  'infra/caddy/Caddyfile',
].forEach(checkFile);

if (!hasFlag('--skip-env')) {
  section('Environment');
  const backendEnv = readEnvFile('.env');
  const frontendEnv = readEnvFile('frontend/.env');

  requireValues(backendEnv, '.env', [
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'APP_BASE_URL',
    'ALLOWED_ORIGINS',
  ]);
  checkJwtSecret(backendEnv);
  requireUrl(backendEnv, '.env', 'SUPABASE_URL');
  requireUrl(backendEnv, '.env', 'APP_BASE_URL');

  requireValues(frontendEnv, 'frontend/.env', [
    'VITE_API_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY',
  ]);
  requireUrl(frontendEnv, 'frontend/.env', 'VITE_API_URL');
  requireUrl(frontendEnv, 'frontend/.env', 'VITE_SUPABASE_URL');
} else {
  warn('Environment validation skipped.');
}

if (!hasFlag('--skip-db-audit')) {
  section('Database security audit');
  runCommand('Supabase security audit', npmBin, ['run', 'db:security:audit']);
} else {
  warn('Database security audit skipped.');
}

if (!hasFlag('--skip-quality')) {
  section('Backend quality');
  runCommand('Backend lint', npmBin, ['run', 'lint']);

  if (!hasFlag('--skip-tests')) {
    runCommand('Backend tests', npmBin, ['test', '--', '--runInBand']);
    runCommand('Backend e2e tests', npmBin, [
      'run',
      'test:e2e',
      '--',
      '--runInBand',
    ]);
  } else {
    warn('Backend tests skipped.');
  }

  runCommand('Backend build', npmBin, ['run', 'build']);
} else {
  warn('Backend quality checks skipped.');
}

if (!hasFlag('--skip-frontend')) {
  section('Frontend quality');
  runCommand('Frontend lint', npmBin, ['run', 'lint'], path.join(rootDir, 'frontend'));

  if (!hasFlag('--skip-frontend-build')) {
    runCommand(
      'Frontend build',
      npmBin,
      ['run', 'build'],
      path.join(rootDir, 'frontend'),
    );
  } else {
    warn('Frontend build skipped.');
  }
} else {
  warn('Frontend quality checks skipped.');
}

if (!hasFlag('--skip-docker')) {
  section('Docker Compose');
  runCommand('Docker Compose config', dockerBin, [
    'compose',
    'config',
    '--quiet',
  ]);
  runCommand('Production Docker Compose config', dockerBin, [
    'compose',
    '--env-file',
    '.env.production.example',
    '-f',
    'docker-compose.prod.yml',
    'config',
    '--quiet',
  ]);
} else {
  warn('Docker validation skipped.');
}

if (hasFlag('--with-ui-e2e')) {
  section('Acceptance UI tests');
  runCommand('Selenium/Cucumber acceptance tests', npmBin, [
    'run',
    'test:acceptance',
  ]);
} else {
  warn('Selenium/Cucumber acceptance tests skipped. Use --with-ui-e2e to run them.');
}

if (failures > 0) {
  log(`\nPredeploy check failed with ${failures} issue(s).`);
  process.exit(1);
}

log('\nPredeploy check passed.');
