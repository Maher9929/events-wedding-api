const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const reportsDir = path.join(rootDir, 'test', 'reports');

const backendLog = path.join(reportsDir, 'backend.log');
const backendErrLog = path.join(reportsDir, 'backend-err.log');
const frontendLog = path.join(reportsDir, 'frontend.log');
const frontendErrLog = path.join(reportsDir, 'frontend-err.log');
const cucumberJson = path.join(reportsDir, 'cucumber-report.json');
const htmlReport = path.join(reportsDir, 'rapport-tests.html');
const screenshotsDir = path.join(reportsDir, 'screenshots');
const htmlDumpsDir = path.join(reportsDir, 'html-dumps');

const backendUrl = process.env.TEST_API_URL || 'http://localhost:3000/api';
const frontendUrl = process.env.TEST_BASE_URL || 'http://localhost:5173';
const waitTimeoutMs = Number(process.env.TEST_WAIT_TIMEOUT_MS || 120000);

function ensureReportsDir() {
  fs.mkdirSync(reportsDir, { recursive: true });
}

function resetLogFile(filePath) {
  fs.writeFileSync(filePath, '');
}

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function emptyDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return;
  }

  for (const entry of fs.readdirSync(dirPath)) {
    fs.rmSync(path.join(dirPath, entry), { recursive: true, force: true });
  }
}

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function createSpawnOptions(cwd, extraEnv = {}, stdio = 'pipe') {
  if (process.platform === 'win32') {
    return {
      cwd,
      env: { ...process.env, ...extraEnv },
      stdio,
      windowsHide: true,
      shell: true,
    };
  }

  return {
    cwd,
    env: { ...process.env, ...extraEnv },
    stdio,
    windowsHide: true,
  };
}

function spawnLoggedProcess(command, args, cwd, stdoutPath, stderrPath, extraEnv = {}) {
  const child = spawn(
    command,
    args,
    createSpawnOptions(cwd, extraEnv, ['ignore', 'pipe', 'pipe']),
  );

  child.stdout.pipe(fs.createWriteStream(stdoutPath, { flags: 'a' }));
  child.stderr.pipe(fs.createWriteStream(stderrPath, { flags: 'a' }));

  return child;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pingUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForUrl(url, timeoutMs, label) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await pingUrl(url)) {
      console.log(`- ${label} pret: ${url}`);
      return;
    }

    await wait(1500);
  }

  throw new Error(`${label} non disponible apres ${Math.round(timeoutMs / 1000)}s: ${url}`);
}

function runCommand(command, args, cwd, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      command,
      args,
      createSpawnOptions(cwd, extraEnv, 'inherit'),
    );

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
      }
    });
  });
}

function killProcessTree(child) {
  if (!child || child.killed || !child.pid) {
    return Promise.resolve();
  }

  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('close', () => resolve());
      killer.on('error', () => resolve());
    });
  }

  child.kill('SIGTERM');
  return Promise.resolve();
}

async function main() {
  ensureReportsDir();
  [backendLog, backendErrLog, frontendLog, frontendErrLog].forEach(resetLogFile);
  [cucumberJson, htmlReport].forEach(removeIfExists);
  [screenshotsDir, htmlDumpsDir].forEach(emptyDirectory);

  const npmCmd = getNpmCommand();
  let backendProcess;
  let frontendProcess;
  let exitCode = 0;

  try {
    console.log('=== Dousha - Selenium + Cucumber ===');
    console.log('1. Demarrage backend...');
    backendProcess = spawnLoggedProcess(
      npmCmd,
      ['run', 'start:dev'],
      rootDir,
      backendLog,
      backendErrLog,
    );

    console.log('2. Demarrage frontend...');
    frontendProcess = spawnLoggedProcess(
      npmCmd,
      ['run', 'dev', '--', '--host', '127.0.0.1'],
      frontendDir,
      frontendLog,
      frontendErrLog,
      {
        VITE_E2E_MODE: 'true',
      },
    );

    console.log('3. Attente des serveurs...');
    await waitForUrl(backendUrl, waitTimeoutMs, 'Backend');
    await waitForUrl(frontendUrl, waitTimeoutMs, 'Frontend');

    console.log('4. Execution Cucumber...');
    await runCommand(
      npmCmd,
      ['run', 'test:cucumber'],
      rootDir,
      {
        TEST_BASE_URL: frontendUrl,
        TEST_API_URL: backendUrl,
      },
    );
  } catch (error) {
    exitCode = 1;
    console.error('\nErreur pendant les tests E2E:');
    console.error(error instanceof Error ? error.message : error);
  } finally {
    console.log('\n5. Generation du rapport...');
    try {
      await runCommand(getNpmCommand(), ['run', 'test:report'], rootDir);
    } catch (error) {
      exitCode = 1;
      console.error('Generation du rapport echouee.');
      console.error(error instanceof Error ? error.message : error);
    }

    console.log('\n6. Arret des serveurs...');
    await killProcessTree(frontendProcess);
    await killProcessTree(backendProcess);

    console.log('\nRapport HTML: test/reports/rapport-tests.html');
    console.log('Captures: test/reports/screenshots');
    console.log('Logs backend: test/reports/backend.log');
    console.log('Logs frontend: test/reports/frontend.log');
  }

  process.exit(exitCode);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
