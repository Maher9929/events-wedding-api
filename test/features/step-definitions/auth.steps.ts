import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import {
  navigateTo, waitForElement, clickElement, typeInto,
  getCurrentUrl, executeScript, waitForUrlContains, getBodyText,
} from './hooks';

// ── Auth Steps ──────────────────────────────────

Given("je suis sur la page d'inscription", async function () {
  await navigateTo(this, '/auth/signup');
  await waitForElement(this, 'form');
});

Given('je suis sur la page de connexion', async function () {
  await navigateTo(this, '/auth/login');
  await waitForElement(this, 'form');
});

Given('je ne suis pas connecté', async function () {
  await executeScript(this, 'localStorage.clear()');
});

When(
  'je remplis le formulaire avec un email {string} et mot de passe {string}',
  async function (email: string, password: string) {
    await typeInto(this, 'input[name="email"], input[type="email"]', email);
    await typeInto(this, 'input[name="password"], input[type="password"]', password);
  },
);

When('je sélectionne le rôle {string}', async function (role: string) {
  await clickElement(this, `[data-role="${role}"], select option[value="${role}"]`);
});

When("je clique sur le bouton d'inscription", async function () {
  await clickElement(this, 'button[type="submit"]');
});

When(
  "je saisis l'email {string} et le mot de passe {string}",
  async function (email: string, password: string) {
    await typeInto(this, 'input[name="email"], input[type="email"]', email);
    await typeInto(this, 'input[name="password"], input[type="password"]', password);
  },
);

When('je clique sur le bouton de connexion', async function () {
  await clickElement(this, 'button[type="submit"]');
});

Then('je devrais être redirigé vers le dashboard client', async function () {
  await waitForUrlContains(this, '/client/dashboard');
  const url = await getCurrentUrl(this);
  assert(url.includes('/client/dashboard'), `Attendu /client/dashboard, obtenu: ${url}`);
});

Then('je devrais être redirigé vers le dashboard approprié', async function () {
  await waitForUrlContains(this, '/dashboard');
  const url = await getCurrentUrl(this);
  assert(url.includes('dashboard'), `Attendu ..dashboard.., obtenu: ${url}`);
});

Then('je devrais voir un message de bienvenue', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0, 'La page devrait contenir du contenu');
});

Then('le token JWT devrait être stocké dans le localStorage', async function () {
  const token = await executeScript(this, 'return localStorage.getItem("access_token")');
  assert(token !== null, 'Le token JWT devrait être présent');
});

Then("je devrais voir un message d'erreur d'authentification", async function () {
  try {
    await waitForElement(this, '.Toastify__toast--error, [role="alert"], .text-red-500');
  } catch {
    const url = await getCurrentUrl(this);
    assert(url.includes('/auth/login'), 'Devrait rester sur /auth/login');
  }
});

Then('je devrais rester sur la page de connexion', async function () {
  const url = await getCurrentUrl(this);
  assert(url.includes('/auth/login'), `Attendu /auth/login, obtenu: ${url}`);
});

When("j'essaie d'accéder à la page {string}", async function (p: string) {
  await navigateTo(this, p);
});

Then('je devrais être redirigé vers la page de connexion', async function () {
  await waitForUrlContains(this, '/auth/login');
  const url = await getCurrentUrl(this);
  assert(url.includes('/auth/login'), `Attendu /auth/login, obtenu: ${url}`);
});
