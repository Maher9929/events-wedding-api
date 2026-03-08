# DOUSHA - Master Demo Presentation

Bienvenue dans la démonstration officielle de la plateforme **DOUSHA**. Ce document constitue le support de présentation idéal pour votre encadreur, illustrant la maturité technique et fonctionnelle du projet.

## 🌟 Vision du Projet
DOUSHA n'est pas seulement une marketplace, c'est un écosystème complet pour l'organisation de mariages, intégrant la gestion des tâches, des invités, des budgets et des paiements sécurisés.

## 🎬 Démonstration Vidéo (Master Demo)
La vidéo ci-dessous montre le flux complet "End-to-End" :
1.  **Client :** Création d'événement et réservation d'un service premium.
2.  **Paiement :** Simulation d'un paiement sécurisé via Stripe.
3.  **Prestataire :** Réception et gestion de la commande.
4.  **Admin :** Pilotage global et statistiques.


## 🏗️ Architecture & Robustesse
- **Backend NestJS :** Architecture modulaire avec gestion d'erreurs globale.
- **Base de données Supabase :** Sécurité par RLS (Row Level Security) et triggers automatiques.
- **Paiements Stripe :** Intégration par webhooks et PaymentIntents.
- **Notifications :** Système en temps réel via Supabase Channels.

## 🔑 Accès Rapide pour Test
| Rôle | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@dousha.qa` | `Dousha2026!` |
| **Client** | `client@dousha.com` | `Dousha2026!` |
| **Prestataire** | `provider@dousha.com` | `Dousha2026!` |

---

## ⚡ Lancement Rapide (Mode Exécutable)
Pour permettre à votre encadreur de lancer le projet sur sa machine, j'ai créé un script `DEMO_START.bat` à la racine du projet. 
Il lui suffit de :
1.  Installer les dépendances (`npm install`).
2.  Double-cliquer sur `DEMO_START.bat`.
3.  Ouvrir `http://localhost:5173`.
