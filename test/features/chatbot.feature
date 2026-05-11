Feature: Chatbot IA - Assistant Doha Events
  En tant que client sur la plateforme Doha Events
  Je veux pouvoir interagir avec un assistant IA
  Afin d'obtenir de l'aide pour organiser mon événement

  Scenario: Le chatbot est visible pour un client connecté
    Given je suis connecté en tant que client
    When je suis sur la page d'accueil
    Then je devrais voir le bouton du chatbot

  Scenario: Le chatbot n'est pas visible pour un prestataire
    Given je suis connecté en tant que prestataire
    When je suis sur la page d'accueil
    Then je ne devrais pas voir le bouton du chatbot

  Scenario: Le chatbot n'est pas visible pour un admin
    Given je suis connecté en tant qu'admin
    When je suis sur la page d'accueil
    Then je ne devrais pas voir le bouton du chatbot

  Scenario: Ouverture et fermeture du chatbot
    Given je suis connecté en tant que client
    And je suis sur la page d'accueil
    When je clique sur le bouton du chatbot
    Then la fenêtre du chatbot devrait s'ouvrir
    And je devrais voir un message d'accueil
    When je clique sur le bouton du chatbot
    Then la fenêtre du chatbot devrait se fermer

  Scenario: Envoi d'un message au chatbot
    Given je suis connecté en tant que client
    And je suis sur la page d'accueil
    And la fenêtre du chatbot est ouverte
    When je saisis le message "Quels services proposez-vous pour un mariage ?"
    And j'envoie le message du chatbot
    Then je devrais voir mon message dans la conversation
    And je devrais voir un indicateur de chargement
    And je devrais recevoir une réponse de l'assistant

