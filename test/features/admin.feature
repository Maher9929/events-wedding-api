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

  Scenario: Gestion des utilisateurs
    Given je suis connecté en tant qu'admin
    When je vais sur la page "Utilisateurs"
    Then je devrais voir la liste de tous les utilisateurs
    And chaque utilisateur devrait afficher son rôle et son statut

  Scenario: Gestion des catégories
    Given je suis connecté en tant qu'admin
    When je vais sur la page "Catégories"
    And je crée une nouvelle catégorie "DJ & Animation"
    Then la catégorie devrait apparaître dans la liste

  Scenario: Modération des avis
    Given je suis connecté en tant qu'admin
    When je vais sur la page "Modération"
    Then je devrais voir les contenus signalés
    When je supprime un avis inapproprié
    Then l'avis devrait être retiré de la plateforme

  Scenario: Consultation des logs d'audit
    Given je suis connecté en tant qu'admin
    When je vais sur la page "Logs d'audit"
    Then je devrais voir l'historique des actions critiques
    And chaque entrée devrait contenir la date, l'utilisateur et l'action
