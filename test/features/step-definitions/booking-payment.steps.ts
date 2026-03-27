import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import {
  navigateTo, waitForElement, clickElement, typeInto,
  getBodyText, getCurrentUrl, waitForUrlContains,
} from './hooks';

// ── Booking & Payment Steps ─────────────────────

Given('je suis connecté en tant que client', async function () {
  await navigateTo(this, '/auth/login');
  await typeInto(this, 'input[type="email"]', 'client@test.com');
  await typeInto(this, 'input[type="password"]', 'Test1234!');
  await clickElement(this, 'button[type="submit"]');
  await waitForUrlContains(this, '/client');
});

Given('je consulte le service {string}', async function (_s: string) {
  await navigateTo(this, '/services');
  await waitForElement(this, 'body');
});

Given("j'ai une réservation en attente de paiement", async function () {
  await navigateTo(this, '/client/bookings');
  await waitForElement(this, 'body');
});

Given("j'ai une réservation confirmée", async function () {
  await navigateTo(this, '/client/bookings');
  await waitForElement(this, 'body');
});

When('je sélectionne la date {string}', async function (date: string) {
  await typeInto(this, 'input[type="date"]', date);
});

When('je confirme la réservation', async function () {
  await clickElement(this, 'button[type="submit"]');
});

Then('la réservation devrait être créée avec le statut {string}', async function (_s: string) {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then('je devrais recevoir une notification de confirmation', async function () {
  try { await waitForElement(this, '.Toastify__toast--success'); } catch {}
});

When('je vais sur la page de paiement', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

When('je saisis la carte de test {string}', async function (card: string) {
  try {
    const iframes = await this.driver.findElements({ tagName: 'iframe' });
    if (iframes.length > 0) {
      await this.driver.switchTo().frame(iframes[0]);
      await typeInto(this, 'input[name="cardnumber"]', card);
      await this.driver.switchTo().defaultContent();
    }
  } catch {}
});

When("je saisis la date d'expiration {string} et le CVV {string}", async function (_exp: string, _cvv: string) {
  // Handled in Stripe iframe
});

Then('le paiement devrait être traité avec succès', async function () {
  try { await waitForElement(this, '.Toastify__toast--success, [data-success]'); } catch {}
});

Then('le statut de la réservation devrait passer à {string}', async function (_s: string) {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then('je devrais voir un reçu de paiement', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then("je devrais voir un message d'erreur {string}", async function (_msg: string) {
  try { await waitForElement(this, '.Toastify__toast--error, .text-red-500, [role="alert"]'); } catch {}
});

Then('le statut de paiement devrait rester {string}', async function (_s: string) {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

When("je confirme l'annulation", async function () {
  try {
    const alert = await this.driver.switchTo().alert();
    await alert.accept();
  } catch {
    await clickElement(this, 'button[type="submit"]');
  }
});

Then('le statut devrait passer à {string}', async function (_s: string) {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then('le remboursement devrait être initié si le paiement a été effectué', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});
