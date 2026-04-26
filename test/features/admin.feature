Feature: Administration de la plateforme
  En tant qu'administrateur de Dousha
  Je veux pouvoir gérer les utilisateurs, services et contenus
  Afin d'assurer le bon fonctionnement de la marketplace

  Scenario: Tableau de bord administrateur
    Given je suis connecté en tant qu'admin
    When je vais sur le dashboard admin
    Then je devrais voir les statistiques globales
    And je devrais voir le nombre total d'utilisateurs
    And je devrais voir le nombre de réservations

