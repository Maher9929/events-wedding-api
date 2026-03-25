import { Builder, By, until, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const TIMEOUT = 10000;

let driver: WebDriver;

/**
 * Create a Selenium WebDriver instance (Chrome headless)
 */
export async function getDriver(): Promise<WebDriver> {
  if (!driver) {
    const options = new chrome.Options();
    options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.manage().setTimeouts({ implicit: TIMEOUT });
  }
  return driver;
}

/**
 * Close the Selenium WebDriver instance
 */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.quit();
    driver = null as any;
  }
}

/**
 * Navigate to a page
 */
export async function navigateTo(path: string): Promise<void> {
  const d = await getDriver();
  await d.get(`${BASE_URL}${path}`);
}

/**
 * Wait for an element to be visible and return it
 */
export async function waitForElement(selector: string, timeout = TIMEOUT) {
  const d = await getDriver();
  return d.wait(until.elementLocated(By.css(selector)), timeout);
}

/**
 * Click an element
 */
export async function clickElement(selector: string): Promise<void> {
  const element = await waitForElement(selector);
  await element.click();
}

/**
 * Type text into an input
 */
export async function typeInto(selector: string, text: string): Promise<void> {
  const element = await waitForElement(selector);
  await element.clear();
  await element.sendKeys(text);
}

/**
 * Get text from an element
 */
export async function getText(selector: string): Promise<string> {
  const element = await waitForElement(selector);
  return element.getText();
}

/**
 * Check if an element exists
 */
export async function elementExists(selector: string): Promise<boolean> {
  const d = await getDriver();
  try {
    await d.findElement(By.css(selector));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current URL
 */
export async function getCurrentUrl(): Promise<string> {
  const d = await getDriver();
  return d.getCurrentUrl();
}

/**
 * Execute JavaScript in the browser
 */
export async function executeScript(script: string): Promise<any> {
  const d = await getDriver();
  return d.executeScript(script);
}

/**
 * Wait for URL to contain a string
 */
export async function waitForUrlContains(text: string, timeout = TIMEOUT): Promise<void> {
  const d = await getDriver();
  await d.wait(until.urlContains(text), timeout);
}

/**
 * Take a screenshot (for debugging)
 */
export async function takeScreenshot(): Promise<string> {
  const d = await getDriver();
  return d.takeScreenshot();
}
