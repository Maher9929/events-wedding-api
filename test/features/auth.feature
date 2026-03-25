Feature: Authentification des utilisateurs
  En tant qu'utilisateur de la plateforme Dousha
  Je veux pouvoir m'inscrire et me connecter
  Afin d'accéder aux fonctionnalités de la marketplace

  Scenario: Inscription d'un nouveau client
    Given je suis sur la page d'inscription
    When je remplis le formulaire avec un email "test_client@dousha.com" et mot de passe "Test1234!"
    And je sélectionne le rôle "client"
    And je clique sur le bouton d'inscription
    Then je devrais être redirigé vers le dashboard client
    And je devrais voir un message de bienvenue

  Scenario: Connexion d'un utilisateur existant
    Given je suis sur la page de connexion
    When je saisis l'email "client@test.com" et le mot de passe "Test1234!"
    And je clique sur le bouton de connexion
    Then je devrais être redirigé vers le dashboard approprié
    And le token JWT devrait être stocké dans le localStorage

  Scenario: Connexion avec des identifiants incorrects
    Given je suis sur la page de connexion
    When je saisis l'email "client@test.com" et le mot de passe "mauvais_mot_de_passe"
    And je clique sur le bouton de connexion
    Then je devrais voir un message d'erreur d'authentification
    And je devrais rester sur la page de connexion

  Scenario: Accès protégé sans authentification
    Given je ne suis pas connecté
    When j'essaie d'accéder à la page "/client/dashboard"
    Then je devrais être redirigé vers la page de connexion
