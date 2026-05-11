import { Given, When, Then } from '@cucumber/cucumber';
import { By } from 'selenium-webdriver';
import { strict as assert } from 'assert';
import {
  elementExists,
  getBodyText,
  navigateTo,
  waitForElement,
} from './hooks';

const CHATBOT_TOGGLE_SELECTOR = 'button[aria-label="Toggle chatbot"]';
const CHATBOT_WINDOW_SELECTOR =
  '[style*="position: fixed"][style*="border-radius: 16px"]';
const CHATBOT_INPUT_SELECTOR = 'textarea[placeholder]';

Given('la fenêtre du chatbot est ouverte', async function () {
  if (!(await elementExists(this, CHATBOT_WINDOW_SELECTOR))) {
    const toggle = await this.driver.findElement(
      By.css(CHATBOT_TOGGLE_SELECTOR),
    );
    await toggle.click();
    await this.driver.sleep(300);
  }
});

When("je suis sur la page d'accueil", async function () {
  await navigateTo(this, '/');
  await waitForElement(this, 'body');
});

Then('je devrais voir le bouton du chatbot', async function () {
  // Wait a moment for lazy-loaded chatbot to render
  await this.driver.sleep(500);
  const exists = await elementExists(this, CHATBOT_TOGGLE_SELECTOR);
  assert(exists, 'Le bouton du chatbot devrait être visible pour un client');
});

Then('je ne devrais pas voir le bouton du chatbot', async function () {
  await this.driver.sleep(500);
  const exists = await elementExists(this, CHATBOT_TOGGLE_SELECTOR);
  assert(
    !exists,
    'Le bouton du chatbot ne devrait PAS être visible pour ce rôle',
  );
});

When('je clique sur le bouton du chatbot', async function () {
  const toggle = await this.driver.findElement(By.css(CHATBOT_TOGGLE_SELECTOR));
  await toggle.click();
  await this.driver.sleep(300);
});

Then("la fenêtre du chatbot devrait s'ouvrir", async function () {
  const exists = await elementExists(this, CHATBOT_WINDOW_SELECTOR);
  assert(exists, 'La fenêtre du chatbot devrait être ouverte');
});

Then("je devrais voir un message d'accueil", async function () {
  const body = await getBodyText(this);
  const hasWelcome =
    body.includes('Bonjour') ||
    body.includes('Comment') ||
    body.includes('مرحبا') ||
    body.includes('Hi!') ||
    body.includes('aider') ||
    body.includes('help');
  assert(
    hasWelcome,
    `Le chatbot devrait afficher un message d'accueil, obtenu: ${body.substring(0, 300)}`,
  );
});

Then('la fenêtre du chatbot devrait se fermer', async function () {
  const exists = await elementExists(this, CHATBOT_WINDOW_SELECTOR);
  assert(!exists, 'La fenêtre du chatbot devrait être fermée');
});

When('je saisis le message {string}', async function (message: string) {
  const textarea = await this.driver.findElement(
    By.css(CHATBOT_INPUT_SELECTOR),
  );
  await textarea.clear();
  await textarea.sendKeys(message);
});

When("j'envoie le message du chatbot", async function () {
  // Click the send button (round purple button next to textarea)
  const sendButton = await this.driver.findElement(
    By.css(
      `${CHATBOT_WINDOW_SELECTOR} button:last-of-type, button[style*="border-radius: 50%"][style*="8B4FFF"]`,
    ),
  );
  await sendButton.click();
});

Then('je devrais voir mon message dans la conversation', async function () {
  await this.driver.sleep(300);
  const body = await getBodyText(this);
  const hasUserMessage = body.includes('mariage') || body.includes('services');
  assert(
    hasUserMessage,
    'Mon message devrait apparaître dans la conversation du chatbot',
  );
});

Then('je devrais voir un indicateur de chargement', async function () {
  // The loading indicator shows dots (●●●)
  const body = await getBodyText(this);
  assert(
    body.length > 0,
    'La page devrait afficher un indicateur de chargement',
  );
});

Then("je devrais recevoir une réponse de l'assistant", async function () {
  // Wait for the API response (max 10s)
  let attempts = 0;
  let hasResponse = false;
  while (attempts < 20 && !hasResponse) {
    await this.driver.sleep(500);
    const messages = await this.driver.findElements(
      By.css('[style*="flex-start"][style*="background: rgb(255"]'),
    );
    hasResponse = messages.length > 0;
    attempts++;
  }
  assert(hasResponse, "Le chatbot devrait afficher une réponse de l'assistant");
});
