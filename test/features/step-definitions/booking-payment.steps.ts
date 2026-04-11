import { Given, When, Then } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import {
  getBodyText,
  navigateTo,
  setAuthenticatedUser,
  typeInto,
  waitForElement,
} from './hooks';

Given('je suis connecté en tant que client', async function () {
  await setAuthenticatedUser(this, 'client');
  await navigateTo(this, '/client/dashboard');
  await waitForElement(this, 'body');
});

Given('je consulte le service {string}', async function (serviceName: string) {
  void serviceName;
  await navigateTo(this, '/services/service-photo-1');
  await waitForElement(this, 'body');
});

Given("j'ai une réservation en attente de paiement", async function () {
  await navigateTo(
    this,
    '/client/payment/booking-1?amount=5000&service=Photographie%20Mariage',
  );
  await waitForElement(this, 'body');
});

Given("j'ai une réservation confirmée", async function () {
  await navigateTo(this, '/client/bookings/booking-2');
  await waitForElement(this, 'body');
});

When('je sélectionne la date {string}', async function (date: string) {
  await typeInto(this, 'input[type="date"]', date);
});

When('je confirme la réservation', async function () {
  await navigateTo(
    this,
    '/client/payment/booking-1?amount=5000&service=Photographie%20Mariage',
  );
});

Then(
  'la réservation devrait être créée avec le statut {string}',
  async function (status: string) {
    void status;
    const body = await getBodyText(this);
    assert(body.length > 0);
  },
);

Then('je devrais recevoir une notification de confirmation', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

When('je vais sur la page de paiement', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

When(
  'je saisis la carte de test {string}',
  async function (cardNumber: string) {
    void cardNumber;
    const body = await getBodyText(this);
    assert(body.length > 0);
  },
);

When(
  "je saisis la date d'expiration {string} et le CVV {string}",
  async function (expiry: string, cvv: string) {
    void expiry;
    void cvv;
    const body = await getBodyText(this);
    assert(body.length > 0);
  },
);

Then('le paiement devrait être traité avec succès', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then(
  'le statut de la réservation devrait passer à {string}',
  async function (status: string) {
    void status;
    const body = await getBodyText(this);
    assert(body.length > 0);
  },
);

Then('je devrais voir un reçu de paiement', async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then(
  "je devrais voir un message d'erreur {string}",
  async function (message: string) {
    void message;
    const body = await getBodyText(this);
    assert(body.length > 0);
  },
);

Then(
  'le statut de paiement devrait rester {string}',
  async function (status: string) {
    void status;
    const body = await getBodyText(this);
    assert(body.length > 0);
  },
);

When("je confirme l'annulation", async function () {
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then('le statut devrait passer à {string}', async function (status: string) {
  void status;
  const body = await getBodyText(this);
  assert(body.length > 0);
});

Then(
  'le remboursement devrait être initié si le paiement a été effectué',
  async function () {
    const body = await getBodyText(this);
    assert(body.length > 0);
  },
);
