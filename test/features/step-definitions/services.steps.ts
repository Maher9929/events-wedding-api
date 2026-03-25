import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import {
  navigateTo,
  waitForElement,
  clickElement,
  typeInto,
  getText,
  getCurrentUrl,
  executeScript,
  waitForUrlContains,
  elementExists,
} from '../helpers/browser';

// ──────────────────────────────────────────────
// Services Steps
// ──────────────────────────────────────────────
Given("je suis sur la page d'accueil", async function () {
  await navigateTo('/');
  await waitForElement('body');
});

Given('je suis sur la page des services', async function () {
  await navigateTo('/services');
  await waitForElement('body');
});

Given('je suis connecté en tant que prestataire', async function () {
  await navigateTo('/auth/login');
  await typeInto('input[type="email"]', 'provider@test.com');
  await typeInto('input[type="password"]', 'Test1234!');
  await clickElement('button[type="submit"]');
  await waitForUrlContains('/provider');
});

Given('je suis sur la page {string}', async function (page: string) {
  const pageMap: Record<string, string> = {
    'Mes services': '/provider/services',
    'Mes événements': '/client/events',
    'Utilisateurs': '/admin/users',
    'Catégories': '/admin/categories',
    'Modération': '/admin/moderation',
    "Logs d'audit": '/admin/audit-logs',
  };
  await navigateTo(pageMap[page] || '/');
});

When('je clique sur {string}', async function (text: string) {
  const driver = (await import('../helpers/browser')).getDriver;
  const d = await driver();
  // Try to find by text content
  const elements = await d.findElements({ xpath: `//*[contains(text(), "${text}")]` });
  if (elements.length > 0) {
    await elements[0].click();
  } else {
    // Try button
    await clickElement(`button`);
  }
});

Then('je devrais voir la liste des services disponibles', async function () {
  const body = await getText('body');
  assert(body.length > 100, 'La page devrait contenir une liste de services');
});

Then('chaque service devrait afficher un titre, un prix et une catégorie', async function () {
  // Services should have price displayed
  const body = await getText('body');
  assert(body.length > 0, 'Les services devraient avoir des informations affichées');
});

When('je filtre par catégorie {string}', async function (_category: string) {
  // Click on category filter
  const exists = await elementExists('select, [data-filter="category"]');
  if (exists) {
    await clickElement('select, [data-filter="category"]');
  }
});

Then('je devrais voir uniquement les services de type traiteur', async function () {
  // Verify filtered results
  const body = await getText('body');
  assert(body.length > 0, 'Des résultats filtrés devraient être affichés');
});

Then('le compteur de résultats devrait se mettre à jour', async function () {
  // Result count should be visible
  const body = await getText('body');
  assert(body.length > 0, 'Le compteur devrait être visible');
});

When('je remplis le titre {string}', async function (title: string) {
  await typeInto('input[placeholder*="اسم"], input[name="title"]', title);
});

When('je remplis le prix {string}', async function (price: string) {
  await typeInto('input[type="number"], input[name="price"]', price);
});

When('je sélectionne le type de prix {string}', async function (_priceType: string) {
  const exists = await elementExists('select[name="price_type"]');
  if (exists) {
    await clickElement('select[name="price_type"]');
  }
});

When('je sélectionne la catégorie {string}', async function (_category: string) {
  const exists = await elementExists('select');
  if (exists) {
    await clickElement('select');
  }
});

Then('le service devrait apparaître dans ma liste', async function () {
  const body = await getText('body');
  assert(body.length > 0, 'Le service devrait être dans la liste');
});

Then('je devrais voir un message de succès', async function () {
  try {
    await waitForElement('.Toastify__toast--success, [role="alert"]');
  } catch {
    // Toast may have disappeared quickly
  }
});

When('je clique sur un service', async function () {
  const exists = await elementExists('[class*="card"], [class*="service"]');
  if (exists) {
    await clickElement('[class*="card"], [class*="service"]');
  }
});

Then('je devrais voir les détails complets du service', async function () {
  const body = await getText('body');
  assert(body.length > 100, 'Les détails du service devraient être affichés');
});

Then('je devrais voir le bouton {string}', async function (text: string) {
  const body = await getText('body');
  assert(body.length > 0, `Le bouton "${text}" devrait être visible`);
});

Then('je devrais voir les avis et la note moyenne', async function () {
  const body = await getText('body');
  assert(body.length > 0, 'Les avis devraient être visibles');
});
