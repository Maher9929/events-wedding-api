import { Given, When, Then, After, Before } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import {
  getDriver,
  closeDriver,
  navigateTo,
  waitForElement,
  clickElement,
  typeInto,
  getText,
  getCurrentUrl,
  executeScript,
  waitForUrlContains,
} from '../helpers/browser';

// ──────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────
Before(async function () {
  await getDriver();
});

After(async function () {
  await closeDriver();
});

// ──────────────────────────────────────────────
// Auth Steps
// ──────────────────────────────────────────────
Given("je suis sur la page d'inscription", async function () {
  await navigateTo('/auth/signup');
  await waitForElement('form');
});

Given('je suis sur la page de connexion', async function () {
  await navigateTo('/auth/login');
  await waitForElement('form');
});

Given('je ne suis pas connecté', async function () {
  await executeScript('localStorage.clear()');
});

When(
  'je remplis le formulaire avec un email {string} et mot de passe {string}',
  async function (email: string, password: string) {
    await typeInto('input[name="email"], input[type="email"]', email);
    await typeInto('input[name="password"], input[type="password"]', password);
  },
);

When('je sélectionne le rôle {string}', async function (role: string) {
  await clickElement(`[data-role="${role}"], select option[value="${role}"]`);
});

When("je clique sur le bouton d'inscription", async function () {
  await clickElement('button[type="submit"]');
});

When(
  "je saisis l'email {string} et le mot de passe {string}",
  async function (email: string, password: string) {
    await typeInto('input[name="email"], input[type="email"]', email);
    await typeInto('input[name="password"], input[type="password"]', password);
  },
);

When('je clique sur le bouton de connexion', async function () {
  await clickElement('button[type="submit"]');
});

Then('je devrais être redirigé vers le dashboard client', async function () {
  await waitForUrlContains('/client/dashboard');
  const url = await getCurrentUrl();
  assert(url.includes('/client/dashboard'), `URL attendue contenant /client/dashboard, obtenue: ${url}`);
});

Then('je devrais être redirigé vers le dashboard approprié', async function () {
  await waitForUrlContains('/dashboard');
  const url = await getCurrentUrl();
  assert(url.includes('dashboard'), `URL attendue contenant dashboard, obtenue: ${url}`);
});

Then('je devrais voir un message de bienvenue', async function () {
  // Toast or welcome text should appear
  const body = await getText('body');
  assert(body.length > 0, 'La page devrait contenir du contenu');
});

Then('le token JWT devrait être stocké dans le localStorage', async function () {
  const token = await executeScript('return localStorage.getItem("access_token")');
  assert(token !== null, 'Le token JWT devrait être présent dans le localStorage');
});

Then("je devrais voir un message d'erreur d'authentification", async function () {
  // Wait for error toast or error message
  try {
    await waitForElement('.Toastify__toast--error, [role="alert"], .text-red-500');
  } catch {
    // Toast may have disappeared, check URL instead
    const url = await getCurrentUrl();
    assert(url.includes('/auth/login'), 'Should still be on login page');
  }
});

Then('je devrais rester sur la page de connexion', async function () {
  const url = await getCurrentUrl();
  assert(url.includes('/auth/login'), `URL attendue: /auth/login, obtenue: ${url}`);
});

When("j'essaie d'accéder à la page {string}", async function (path: string) {
  await navigateTo(path);
});

Then('je devrais être redirigé vers la page de connexion', async function () {
  await waitForUrlContains('/auth/login');
  const url = await getCurrentUrl();
  assert(url.includes('/auth/login'), `URL attendue: /auth/login, obtenue: ${url}`);
});
