#!/usr/bin/env node

const { existsSync, readdirSync, readFileSync } = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
const strict = process.argv.includes('--strict');

const warnings = [];

function warn(message) {
  warnings.push(message);
  process.stdout.write(`[WARN] ${message}\n`);
}

function pass(message) {
  process.stdout.write(`[OK] ${message}\n`);
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ');
}

function getMigrationFiles() {
  if (!existsSync(migrationsDir)) {
    throw new Error('supabase/migrations directory is missing.');
  }

  return readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

function auditMigrationNames(files) {
  const prefixCounts = new Map();

  for (const file of files) {
    const prefix = file.match(/^(\d+[a-z]?)(?:_|-)/i)?.[1];

    if (!prefix) {
      warn(`${file}: migration filename does not start with a numeric prefix.`);
      continue;
    }

    prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
  }

  for (const [prefix, count] of prefixCounts) {
    if (count > 1) {
      warn(
        `migration prefix ${prefix} is used ${count} times; prefer unique timestamp-style migration names.`,
      );
    }
  }
}

function extractCreatedTables(combinedSql) {
  const tables = new Set();
  const regex =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(public)\.)?([a-z_][a-z0-9_]*)/gi;

  for (const match of combinedSql.matchAll(regex)) {
    tables.add(match[2]);
  }

  return [...tables].sort();
}

function auditRlsCoverage(combinedSql) {
  const tables = extractCreatedTables(combinedSql);

  for (const table of tables) {
    const rlsRegex = new RegExp(
      `alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`,
      'i',
    );

    if (!rlsRegex.test(combinedSql)) {
      warn(`${table}: table is created but RLS is not enabled in migrations.`);
    }
  }
}

function auditBroadPolicies(files) {
  const broadPolicyRegex =
    /create\s+policy\s+(?:"[^"]+"|'[^']+'|[a-z_][a-z0-9_]*)\s+on\s+([a-z_.][a-z0-9_.]*)\s+for\s+all\s+(?!to\s+service_role\b)[^;]*using\s*\(\s*true\s*\)\s+with\s+check\s*\(\s*true\s*\)/gi;

  for (const file of files) {
    const sql = normalizeSql(
      readFileSync(path.join(migrationsDir, file), 'utf8').toLowerCase(),
    );

    for (const match of sql.matchAll(broadPolicyRegex)) {
      warn(
        `${file}: broad FOR ALL policy on ${match[1]} is not restricted to service_role.`,
      );
    }
  }
}

function auditStoragePolicies(files) {
  const anonymousInsertPolicies = new Map();

  for (const file of files) {
    const sql = normalizeSql(
      readFileSync(path.join(migrationsDir, file), 'utf8').toLowerCase(),
    );

    if (sql.includes('drop policy if exists "anyone can upload to attachments"')) {
      anonymousInsertPolicies.delete('Anyone can upload to attachments');
    }

    if (
      sql.includes('on storage.objects for insert') &&
      sql.includes("bucket_id = 'attachments'") &&
      !sql.includes('to authenticated') &&
      !sql.includes('to service_role')
    ) {
      anonymousInsertPolicies.set('Anyone can upload to attachments', file);
    }
  }

  for (const [policyName, file] of anonymousInsertPolicies) {
    warn(
      `${file}: storage insert policy "${policyName}" allows non-authenticated uploads.`,
    );
  }
}

function main() {
  process.stdout.write('== Supabase security audit ==\n');
  const files = getMigrationFiles();
  const combinedSql = normalizeSql(
    files.map((file) => readFileSync(path.join(migrationsDir, file), 'utf8')).join('\n'),
  ).toLowerCase();

  auditMigrationNames(files);
  auditRlsCoverage(combinedSql);
  auditBroadPolicies(files);
  auditStoragePolicies(files);

  if (warnings.length === 0) {
    pass('No obvious Supabase migration security issues found.');
    return;
  }

  process.stdout.write(
    `\nSupabase security audit completed with ${warnings.length} warning(s).`,
  );

  if (strict) {
    process.stdout.write('\nStrict mode failed.\n');
    process.exit(1);
  }

  process.stdout.write('\nRun with --strict to fail on warnings.\n');
}

main();
