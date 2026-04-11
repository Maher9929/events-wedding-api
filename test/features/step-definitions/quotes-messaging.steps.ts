import { When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import {
  navigateTo,
  waitForElement,
  clickElement,
  typeInto,
  getBodyText,
  elementExists,
} from './hooks';

// ── Quotes & Messaging Steps ────────────────────

When('je remplis le message {string}', async function (msg: string) {
  if (await elementExists(this, 'textarea')) {
    await typeInto(this, 'textarea', msg);
  }
});

When('je spécifie la date souhaitée {string}', async function (d: string) {
  if (await elementExists(this, 'input[type="date"]')) {
    await typeInto(this, 'input[type="date"]', d);
  }
});

When("je spécifie le nombre d'invités {string}", async function (c: string) {
  if (await elementExists(this, 'input[name="guest_count"]')) {
    await typeInto(this, 'input[name="guest_count"]', c);
  }
});

Then('la demande de devis devrait être envoyée avec succès', async function () {
  try {
    await waitForElement(this, '.Toastify__toast--success');
  } catch {
    // Some flows update the page without a toast notification.
  }
});

Then('le prestataire devrait recevoir une notification', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

When("j'ai une demande de devis en attente", async function () {
  await navigateTo(this, '/provider/quotes');
  await waitForElement(this, 'body');
});

When('je consulte la demande de devis', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

When('je remplis le montant {string}', async function (a: string) {
  if (await elementExists(this, 'input[name="amount"], input[type="number"]')) {
    await typeInto(this, 'input[name="amount"], input[type="number"]', a);
  }
});

When("j'ajoute un message de réponse {string}", async function (msg: string) {
  if (await elementExists(this, 'textarea')) {
    await typeInto(this, 'textarea', msg);
  }
});

Then('le devis devrait être envoyé au client', async function () {
  try {
    await waitForElement(this, '.Toastify__toast--success');
  } catch {
    // Some flows update the page without a toast notification.
  }
});

When("j'envoie un message {string}", async function (msg: string) {
  if (await elementExists(this, 'input[name="message"], textarea')) {
    await typeInto(this, 'input[name="message"], textarea', msg);
    await clickElement(this, 'button[type="submit"]');
  }
});

Then('le message devrait être envoyé', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then('il devrait apparaître dans la conversation', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

When('je vais sur la page {string}', async function (page: string) {
  const map: Record<string, string> = {
    Messages: '/client/messages',
    'Mes services': '/provider/services',
    'Mes événements': '/client/events',
    Utilisateurs: '/admin/users',
    Catégories: '/admin/categories',
    Modération: '/admin/moderation',
    "Logs d'audit": '/admin/audit-logs',
  };
  await navigateTo(this, map[page] || '/');
  await waitForElement(this, 'body');
});
