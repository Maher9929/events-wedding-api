# Events & Wedding Services Marketplace

Plateforme web de mise en relation entre clients organisateurs et prestataires pour des evenements tels que mariages, fiancailles, anniversaires et evenements corporate.

## Stack

- Backend: NestJS + TypeScript
- Frontend: React + TypeScript + Vite
- Base de donnees: Supabase PostgreSQL
- Authentification: JWT + Supabase Auth
- Paiement: Stripe
- Stockage: Supabase Storage
- Infra: Docker / Docker Compose

## Modules principaux

- `users`: inscription, connexion, profils, roles
- `providers`: profils prestataires, disponibilites, KYC, statistiques
- `services`: catalogue marketplace, filtres, featured services
- `events`: gestion evenement, budget, checklist, timeline, invites
- `quotes`: demandes de devis et offres
- `messages`: conversations et messagerie interne
- `bookings`: reservations et suivi
- `payments`: intents Stripe, confirmations, remboursements, factures
- `reviews`: avis, notes, signalement
- `moderation`: moderation admin, reports, KYC
- `notifications`: notifications applicatives

## Roles

- `client`: organise un evenement, demande des devis, reserve, paie, laisse des avis
- `provider`: gere son profil, ses services, son calendrier, ses devis et ses reservations
- `admin`: gere les utilisateurs, categories, moderation, verification et supervision

## Fonctionnalites deja presentes

- Authentification JWT avec controle par roles
- Catalogue de services avec categories et filtres
- Profils prestataires avec portfolio et disponibilites
- Creation d'evenements et tableau de bord de planification
- Demandes de devis et messagerie interne
- Reservations et paiements Stripe
- Systeme d'avis et moderation
- KYC prestataire
- Dashboard admin et dashboard prestataire
- Internationalisation frontend FR / EN / AR

## Lancer le projet

### Backend

```bash
npm install
npm run build
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm run dev
```

### Docker

```bash
copy .env.example .env
docker compose up --build
```

Application:

- Frontend: `http://localhost`
- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`

Services optionnels:

```bash
docker compose --profile cache --profile observability up --build
```

## Variables d'environnement principales

```env
PORT=3000
JWT_SECRET=your_jwt_secret

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## Tests

```bash
npm test -- --runInBand
npm run build

cd frontend
npm run build
```

## API utile

- `POST /users/register`
- `POST /users/login`
- `GET /users/profile`
- `GET /services`
- `GET /providers`
- `POST /events`
- `POST /quotes/request`
- `POST /bookings`
- `POST /payments/create-intent/:bookingId`
- `GET /messages/conversations`

Swagger est disponible sur `http://localhost:3000/api`.

## Etat actuel

Le projet couvre une grande partie du cahier des charges de marketplace evenementielle. Les points les plus sensibles de securite backend ont ete renforces, notamment sur l'acces aux evenements, aux conversations, aux reservations et aux paiements.

## Pistes d'amelioration

- enrichir les tests e2e backend/frontend
- finaliser la logique de commissions marketplace
- brancher un monitoring complet en production
- consolider les statistiques metier avec des donnees 100% reelles
- finaliser la documentation produit et la conformite legale
