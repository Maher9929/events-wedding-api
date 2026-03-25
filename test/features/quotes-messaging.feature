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

  Scenario: Réponse à une demande de devis par un prestataire
    Given je suis connecté en tant que prestataire
    And j'ai une demande de devis en attente
    When je consulte la demande de devis
    And je remplis le montant "8000"
    And j'ajoute un message de réponse "Nous serions ravis de décorer votre mariage"
    And je clique sur "Envoyer le devis"
    Then le devis devrait être envoyé au client
    And le statut devrait passer à "sent"

  Scenario: Messagerie entre client et prestataire
    Given je suis connecté en tant que client
    When je vais sur la page "Messages"
    And j'envoie un message "Bonjour, avez-vous des disponibilités en septembre ?"
    Then le message devrait être envoyé
    And il devrait apparaître dans la conversation
