import { Before, After, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { Builder, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import * as fs from 'fs';
import * as path from 'path';

// Increase default timeout for Selenium operations (30 seconds)
setDefaultTimeout(30000);

let driver: WebDriver | null = null;
const SCREENSHOTS_DIR = path.join(process.cwd(), 'test', 'reports', 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

/**
 * Before each scenario: Launch Chrome browser
 */
Before(async function () {
  const options = new chrome.Options();
  options.addArguments(
    '--headless',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1920,1080',
  );

  driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  await driver.manage().setTimeouts({ implicit: 10000 });

  // Make driver accessible to step definitions via World
  this.driver = driver;
});

/**
 * After each scenario:
 * - If FAILED → capture screenshot and attach to report
 * - Close browser
 */
After(async function (scenario) {
  if (driver) {
    // 📸 Screenshot on failure
    if (scenario.result?.status === Status.FAILED) {
      try {
        const screenshot = await driver.takeScreenshot();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const scenarioName = scenario.pickle.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
        const filename = `FAIL_${scenarioName}_${timestamp}.png`;
        const filepath = path.join(SCREENSHOTS_DIR, filename);

        // Save to disk
        fs.writeFileSync(filepath, screenshot, 'base64');

        // Attach to Cucumber report (embedded in JSON report)
        this.attach(screenshot, 'image/png');

        console.log(`\n📸 Screenshot saved: ${filepath}`);
      } catch (err) {
        console.error('Failed to capture screenshot:', err);
      }
    }

    await driver.quit();
    driver = null;
  }
});

/**
 * After all scenarios: Generate HTML report
 */
AfterAll(async function () {
  console.log('\n📊 Test execution complete.');
  console.log(`📸 Screenshots saved in: ${SCREENSHOTS_DIR}`);
  console.log('📄 Run "npm run test:report" to generate HTML report.\n');
});

export { driver };
