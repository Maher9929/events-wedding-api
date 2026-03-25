Feature: Gestion des services
  En tant que prestataire sur la plateforme Dousha
  Je veux pouvoir créer et gérer mes services
  Afin de proposer mes prestations aux clients

  Scenario: Affichage du catalogue de services
    Given je suis sur la page d'accueil
    When je clique sur "Parcourir les services"
    Then je devrais voir la liste des services disponibles
    And chaque service devrait afficher un titre, un prix et une catégorie

  Scenario: Recherche et filtrage des services
    Given je suis sur la page des services
    When je filtre par catégorie "Traiteur"
    Then je devrais voir uniquement les services de type traiteur
    And le compteur de résultats devrait se mettre à jour

  Scenario: Création d'un service par un prestataire
    Given je suis connecté en tant que prestataire
    And je suis sur la page "Mes services"
    When je clique sur "Ajouter un service"
    And je remplis le titre "Photographie Mariage Premium"
    And je remplis le prix "5000"
    And je sélectionne le type de prix "package"
    And je sélectionne la catégorie "Photographie"
    And je clique sur "Créer"
    Then le service devrait apparaître dans ma liste
    And je devrais voir un message de succès

  Scenario: Consultation d'un service détaillé
    Given je suis sur la page des services
    When je clique sur un service
    Then je devrais voir les détails complets du service
    And je devrais voir le bouton "Demander un devis"
    And je devrais voir les avis et la note moyenne
