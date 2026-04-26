Feature: Gestion des événements
  En tant que client organisateur sur Dousha
  Je veux pouvoir créer et gérer mes événements
  Afin de planifier chaque détail de mon mariage ou événement

  Scenario: Création d'un événement
    Given je suis connecté en tant que client
    And je suis sur la page "Mes événements"
    When je clique sur "Créer un événement"
    And je remplis le titre "Mon Mariage"
    And je sélectionne le type "wedding"
    And je sélectionne la date "2026-09-20"
    And je remplis le budget "50000"
    And je remplis le nombre d'invités "200"
    And je clique sur "Créer"
    Then l'événement devrait être créé avec succès
    And je devrais être redirigé vers le tableau de bord de l'événement

  Scenario: Gestion de la checklist d'un événement
    Given je suis connecté en tant que client
    And j'ai un événement existant
    When je vais dans l'onglet "Checklist"
    And j'ajoute une tâche "Réserver le traiteur"
    Then la tâche devrait apparaître dans la liste
    When je marque la tâche comme complétée
    Then la progression devrait se mettre à jour

