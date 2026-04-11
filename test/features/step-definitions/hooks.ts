import {
  After,
  AfterAll,
  Before,
  setDefaultTimeout,
  Status,
  World,
} from '@cucumber/cucumber';
import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import chromedriver from 'chromedriver';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const TIMEOUT = 8000;
const HEADLESS = process.env.SELENIUM_HEADLESS !== 'false';
const REPORTS_DIR = path.join(process.cwd(), 'test', 'reports');
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots');
const HTML_DUMPS_DIR = path.join(REPORTS_DIR, 'html-dumps');

setDefaultTimeout(30000);

for (const dir of [REPORTS_DIR, SCREENSHOTS_DIR, HTML_DUMPS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

Before(async function (this: World, scenario) {
  console.log(`\nScenario: ${scenario.pickle.name}`);
  const options = new chrome.Options();

  if (HEADLESS) {
    options.addArguments('--headless=new');
  }

  options.addArguments(
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1920,1080',
  );

  const service = new chrome.ServiceBuilder(chromedriver.path);

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeService(service)
    .setChromeOptions(options)
    .build();

  await driver.manage().setTimeouts({ implicit: TIMEOUT, pageLoad: 20000 });
  (this as any).driver = driver;
  (this as any).baseUrl = BASE_URL;
});

After(async function (this: World, scenario) {
  const driver: WebDriver = (this as any).driver;
  if (!driver) return;

  if (scenario.result?.status === Status.FAILED) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeName = scenario.pickle.name
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 60);
      const screenshotPath = path.join(
        SCREENSHOTS_DIR,
        `FAIL_${safeName}_${timestamp}.png`,
      );
      const htmlDumpPath = path.join(
        HTML_DUMPS_DIR,
        `FAIL_${safeName}_${timestamp}.html`,
      );
      const currentUrl = await driver.getCurrentUrl();
      const screenshot = await driver.takeScreenshot();
      const pageSource = await driver.getPageSource();

      fs.writeFileSync(screenshotPath, screenshot, 'base64');
      fs.writeFileSync(htmlDumpPath, pageSource, 'utf8');

      this.attach(screenshot, 'image/png');
      this.attach(
        `Page URL: ${currentUrl}\nScreenshot: ${screenshotPath}\nHTML: ${htmlDumpPath}`,
        'text/plain',
      );

      console.log(`\n  Screenshot: ${screenshotPath}`);
      console.log(`  HTML dump: ${htmlDumpPath}`);
      console.log(`  URL: ${currentUrl}`);
    } catch (error) {
      console.error('  Failed to collect debug artifacts:', error);
    }
  }

  await driver.quit();
});

AfterAll(async function () {
  console.log('\n-------------------------------------');
  console.log('Test execution complete.');
  console.log(`Screenshots: ${SCREENSHOTS_DIR}`);
  console.log(`HTML dumps: ${HTML_DUMPS_DIR}`);
  console.log('Report command: npm run test:report');
  console.log('-------------------------------------\n');
});

export async function navigateTo(world: any, urlPath: string) {
  await world.driver.get(`${world.baseUrl}${urlPath}`);
}

export async function waitForElement(
  world: any,
  selector: string,
  timeout = TIMEOUT,
) {
  return world.driver.wait(until.elementLocated(By.css(selector)), timeout);
}

export async function clickElement(world: any, selector: string) {
  const element = await waitForElement(world, selector);
  await element.click();
}

export async function typeInto(world: any, selector: string, text: string) {
  const element = await waitForElement(world, selector);
  await element.clear();
  await element.sendKeys(text);
}

export async function getText(world: any, selector: string) {
  const element = await waitForElement(world, selector);
  return element.getText();
}

export async function getBodyText(world: any) {
  const element = await world.driver.findElement(By.css('body'));
  return element.getText();
}

export async function getCurrentUrl(world: any): Promise<string> {
  return world.driver.getCurrentUrl();
}

export async function executeScript(world: any, script: string) {
  return world.driver.executeScript(script);
}

function createJwt(
  role: 'client' | 'provider' | 'admin',
  userId: string,
  email: string,
) {
  const header = Buffer.from(
    JSON.stringify({ alg: 'none', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email,
      role,
      exp: 1924992000,
    }),
  ).toString('base64url');
  return `${header}.${payload}.e2e-signature`;
}

export async function setAuthenticatedUser(
  world: any,
  role: 'client' | 'provider' | 'admin',
) {
  const userMap = {
    client: {
      id: 'user-client-1',
      email: 'client@test.com',
      full_name: 'Client Demo',
      role: 'client' as const,
    },
    provider: {
      id: 'user-provider-1',
      email: 'provider@test.com',
      full_name: 'Studio Amal',
      role: 'provider' as const,
    },
    admin: {
      id: 'user-admin-1',
      email: 'admin@test.com',
      full_name: 'Admin Dousha',
      role: 'admin' as const,
    },
  };
  const user = userMap[role];
  const token = createJwt(role, user.id, user.email);

  await navigateTo(world, '/');
  await world.driver.executeScript(
    `
      localStorage.setItem('access_token', arguments[0]);
      localStorage.setItem('user', JSON.stringify(arguments[1]));
      window.dispatchEvent(new StorageEvent('storage', { key: 'user' }));
    `,
    token,
    user,
  );
}

export async function clearAuthState(world: any) {
  await navigateTo(world, '/');
  await world.driver.executeScript(`
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.dispatchEvent(new StorageEvent('storage', { key: 'user' }));
  `);
}

export async function waitForUrlContains(
  world: any,
  text: string,
  timeout = TIMEOUT,
) {
  await world.driver.wait(until.urlContains(text), timeout);
}

export async function elementExists(
  world: any,
  selector: string,
): Promise<boolean> {
  try {
    await world.driver.findElement(By.css(selector));
    return true;
  } catch {
    return false;
  }
}
