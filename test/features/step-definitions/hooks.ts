import { Before, After, AfterAll, Status, setDefaultTimeout, World } from '@cucumber/cucumber';
import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import * as fs from 'fs';
import * as path from 'path';

// ── Config ──────────────────────────────────────
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const TIMEOUT = 8000;
const SCREENSHOTS_DIR = path.join(process.cwd(), 'test', 'reports', 'screenshots');

setDefaultTimeout(30000);

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// ── Before: launch Chrome ───────────────────────
Before(async function (this: World) {
  const options = new chrome.Options();
  options.addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1920,1080',
  );

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  await driver.manage().setTimeouts({ implicit: TIMEOUT });
  (this as any).driver = driver;
  (this as any).baseUrl = BASE_URL;
});

// ── After: screenshot on failure + quit ─────────
After(async function (this: World, scenario) {
  const driver: WebDriver = (this as any).driver;
  if (!driver) return;

  if (scenario.result?.status === Status.FAILED) {
    try {
      const screenshot = await driver.takeScreenshot();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const name = scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60);
      const filename = `FAIL_${name}_${ts}.png`;
      const filepath = path.join(SCREENSHOTS_DIR, filename);

      fs.writeFileSync(filepath, screenshot, 'base64');
      this.attach(screenshot, 'image/png');
      console.log(`\n  📸 Screenshot: ${filepath}`);
    } catch (e) {
      console.error('  ⚠️ Screenshot capture failed:', e);
    }
  }

  await driver.quit();
});

// ── AfterAll ────────────────────────────────────
AfterAll(async function () {
  console.log('\n─────────────────────────────────────');
  console.log('📊 Test execution complete.');
  console.log(`📸 Screenshots in: ${SCREENSHOTS_DIR}`);
  console.log('📄 Run: npm run test:report');
  console.log('─────────────────────────────────────\n');
});

// ── Helper functions (use this.driver) ──────────
export async function navigateTo(world: any, urlPath: string) {
  await world.driver.get(`${world.baseUrl}${urlPath}`);
}

export async function waitForElement(world: any, selector: string, timeout = TIMEOUT) {
  return world.driver.wait(until.elementLocated(By.css(selector)), timeout);
}

export async function clickElement(world: any, selector: string) {
  const el = await waitForElement(world, selector);
  await el.click();
}

export async function typeInto(world: any, selector: string, text: string) {
  const el = await waitForElement(world, selector);
  await el.clear();
  await el.sendKeys(text);
}

export async function getText(world: any, selector: string) {
  const el = await waitForElement(world, selector);
  return el.getText();
}

export async function getBodyText(world: any) {
  const el = await world.driver.findElement(By.css('body'));
  return el.getText();
}

export async function getCurrentUrl(world: any): Promise<string> {
  return world.driver.getCurrentUrl();
}

export async function executeScript(world: any, script: string) {
  return world.driver.executeScript(script);
}

export async function waitForUrlContains(world: any, text: string, timeout = TIMEOUT) {
  await world.driver.wait(until.urlContains(text), timeout);
}

export async function elementExists(world: any, selector: string): Promise<boolean> {
  try {
    await world.driver.findElement(By.css(selector));
    return true;
  } catch {
    return false;
  }
}
