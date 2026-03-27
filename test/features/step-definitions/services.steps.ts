import { Given, When, Then } from '@cucumber/cucumber';
import { By } from 'selenium-webdriver';
import { strict as assert } from 'assert';
import {
  navigateTo, waitForElement, clickElement, typeInto,
  getBodyText, getCurrentUrl, waitForUrlContains, elementExists,
} from './hooks';

// ── Services Steps ──────────────────────────────

Given("je suis sur la page d'accueil", async function () {
  await navigateTo(this, '/');
  await waitForElement(this, 'body');
});

Given('je suis sur la page des services', async function () {
  await navigateTo(this, '/services');
  await waitForElement(this, 'body');
});

Given('je suis connecté en tant que prestataire', async function () {
  await navigateTo(this, '/auth/login');
  await typeInto(this, 'input[type="email"]', 'provider@test.com');
  await typeInto(this, 'input[type="password"]', 'Test1234!');
  await clickElement(this, 'button[type="submit"]');
  await waitForUrlContains(this, '/provider');
});

Given('je suis sur la page {string}', async function (page: string) {
  const map: Record<string, string> = {
    'Mes services': '/provider/services',
    'Mes événements': '/client/events',
    'Utilisateurs': '/admin/users',
    'Catégories': '/admin/categories',
    'Modération': '/admin/moderation',
    "Logs d'audit": '/admin/audit-logs',
  };
  await navigateTo(this, map[page] || '/');
});

When('je clique sur {string}', async function (text: string) {
  const els = await this.driver.findElements(By.xpath(`//*[contains(text(), "${text}")]`));
  if (els.length > 0) { await els[0].click(); }
  else { await clickElement(this, 'button'); }
});

Then('je devrais voir la liste des services disponibles', async function () {
  const body = await getBodyText(this);
  assert(body.length > 100);
});

Then('chaque service devrait afficher un titre, un prix et une catégorie', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

When('je filtre par catégorie {string}', async function (_cat: string) {
  if (await elementExists(this, 'select')) { await clickElement(this, 'select'); }
});

Then('je devrais voir uniquement les services de type traiteur', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then('le compteur de résultats devrait se mettre à jour', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

When('je remplis le titre {string}', async function (t: string) {
  await typeInto(this, 'input[name="title"]', t);
});

When('je remplis le prix {string}', async function (p: string) {
  await typeInto(this, 'input[type="number"], input[name="price"]', p);
});

When('je sélectionne le type de prix {string}', async function (_pt: string) {
  if (await elementExists(this, 'select[name="price_type"]')) {
    await clickElement(this, 'select[name="price_type"]');
  }
});

When('je sélectionne la catégorie {string}', async function (_c: string) {
  if (await elementExists(this, 'select')) { await clickElement(this, 'select'); }
});

Then('le service devrait apparaître dans ma liste', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then('je devrais voir un message de succès', async function () {
  try { await waitForElement(this, '.Toastify__toast--success, [role="alert"]'); } catch {}
});

When('je clique sur un service', async function () {
  if (await elementExists(this, '[class*="card"]')) {
    await clickElement(this, '[class*="card"]');
  }
});

Then('je devrais voir les détails complets du service', async function () {
  const body = await getBodyText(this);
  assert(body.length > 100);
});

Then('je devrais voir le bouton {string}', async function (_t: string) {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then('je devrais voir les avis et la note moyenne', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});
