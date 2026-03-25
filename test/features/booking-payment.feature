Feature: Réservation et paiement
  En tant que client sur la plateforme Dousha
  Je veux pouvoir réserver des services et payer en ligne
  Afin d'organiser mon événement

  Scenario: Réservation d'un service
    Given je suis connecté en tant que client
    And je consulte le service "Photographie Mariage"
    When je clique sur "Réserver"
    And je sélectionne la date "2026-06-15"
    And je confirme la réservation
    Then la réservation devrait être créée avec le statut "pending"
    And je devrais recevoir une notification de confirmation

  Scenario: Paiement par carte bancaire (Stripe)
    Given je suis connecté en tant que client
    And j'ai une réservation en attente de paiement
    When je vais sur la page de paiement
    And je saisis la carte de test "4242424242424242"
    And je saisis la date d'expiration "12/30" et le CVV "123"
    And je clique sur "Payer"
    Then le paiement devrait être traité avec succès
    And le statut de la réservation devrait passer à "fully_paid"
    And je devrais voir un reçu de paiement

  Scenario: Paiement avec carte refusée
    Given je suis connecté en tant que client
    And j'ai une réservation en attente de paiement
    When je vais sur la page de paiement
    And je saisis la carte de test "4000000000000002"
    And je clique sur "Payer"
    Then je devrais voir un message d'erreur "Carte refusée"
    And le statut de paiement devrait rester "pending"

  Scenario: Annulation d'une réservation
    Given je suis connecté en tant que client
    And j'ai une réservation confirmée
    When je clique sur "Annuler la réservation"
    And je confirme l'annulation
    Then le statut devrait passer à "cancelled"
    And le remboursement devrait être initié si le paiement a été effectué
