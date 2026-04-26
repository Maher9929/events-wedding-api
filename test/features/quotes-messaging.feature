Feature: Devis et Messagerie
  En tant qu'utilisateur de la plateforme Dousha
  Je veux pouvoir demander des devis et communiquer avec les prestataires
  Afin de comparer les offres et organiser mon événement

  Scenario: Envoi d'une demande de devis
    Given je suis connecté en tant que client
    And je consulte le service "Décoration Florale"
    When je clique sur "Demander un devis"
    And je remplis le message "Je souhaite un devis pour mon mariage le 20 septembre"
    And je spécifie la date souhaitée "2026-09-20"
    And je spécifie le nombre d'invités "200"
    And je clique sur "Envoyer"
    Then la demande de devis devrait être envoyée avec succès
    And le prestataire devrait recevoir une notification

