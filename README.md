# Valhall

Valhall is a web application for managing members, bongar, recent activity, account linking, and redemptions.

The project is structured as an npm monorepo containing a React frontend, NestJS microservices, and a shared authentication package. 

## Architecture

The current service boundaries, database schemas, account-link flow, and shot flow are documented in:

[View the architecture documentation](./database-architecture.md)

`bong-api` currently communicates with `member-api` using internal HTTP requests. gRPC and Redis are possible future additions but are not currently implemented.

## Technology

- React 19
- TypeScript
- Vite
- Tailwind CSS
- NestJS
- Prisma
- PostgreSQL
- Keycloak
- Swagger / OpenAPI
- Docker Compose
- Vitest and Jest

## Repository structure

```text
frontend/                  React frontend
services/bong-api/         Shots, activity and redemption API
services/member-api/       Members and account-linking API
packages/auth/             Shared NestJS Keycloak authentication
docker-compose.yaml        Local application and databases
database-architecture.md   Database documentation
```

## Prerequisites

Install:

- Node.js and npm
- Docker with Docker Compose
- Access to the configured Keycloak realm

## Environment configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the values:

```dotenv
POSTGRES_USER=valhall
POSTGRES_PASSWORD=change-me
POSTGRES_DB_BONG=valhall_bong
POSTGRES_DB_MEMBER=valhall_member

KEYCLOAK_URL=https://auth.example.com
KEYCLOAK_REALM=valhall

VITE_KEYCLOAK_CLIENT_ID=valhall-frontend-dev
KEYCLOAK_CLIENT_ID=valhall-api-dev

FRONTEND_URL=http://localhost:5173
MEMBER_API_URL=http://localhost:3002
```

Do not commit real passwords or credentials.

## Install dependencies

Run from the repository root:

```bash
npm install
```

Because the project uses npm workspaces, this installs dependencies for the frontend, services, and shared packages.

## Run with Docker Compose

Start the complete local environment:

```bash
docker compose up --build
```

Services are exposed on:

| Service | Address |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Bong API | `http://localhost:3001` |
| Member API | `http://localhost:3002` |
| Bong PostgreSQL | `localhost:5433` |
| Member PostgreSQL | `localhost:5434` |

Stop the environment:

```bash
docker compose down
```

To also delete the local database volumes:

```bash
docker compose down -v
```

Warning: the second command permanently deletes local database data.

## Run services with npm

Start the PostgreSQL containers:

```bash
docker compose up -d postgres-bong postgres-member
```

Run each application in a separate terminal:

```bash
npm run start:member
```

```bash
npm run start:bong
```

```bash
npm run start:frontend
```

## Prisma

Generate both Prisma clients:

```bash
npx prisma generate --schema services/member-api/prisma/schema.prisma
npx prisma generate --schema services/bong-api/prisma/schema.prisma
```

Run development migrations from the relevant service:

```bash
cd services/member-api
npx prisma migrate dev
```

```bash
cd services/bong-api
npx prisma migrate dev
```

Container startup uses `prisma migrate deploy` to apply committed migrations.

## Authentication

The frontend authenticates users through Keycloak and sends the resulting JWT in the HTTP header:

```http
Authorization: Bearer <token>
```

Both APIs validate the JWT through the shared `@valhall/auth` package.

Member accounts can be linked to Keycloak identities. The Keycloak `sub` claim is stored as the member's `keycloakId`.

This will probably be changed to a cookie later.

## API documentation

Swagger is available while the APIs are running:

- Bong API: `http://localhost:3001/api/bong/docs`
- Member API: `http://localhost:3002/api/member/docs`

Protected endpoints require a Keycloak bearer token.

## Useful API endpoints

### Bong API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/add` | Add bongar to a member |
| `GET` | `/api/add/recent` | Load recent activity |
| `POST` | `/api/redemption` | Create a redemption request |

### Member API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/members/gudar` | List members |
| `GET` | `/api/members/shot-targets` | List valid shot targets |
| `POST` | `/api/members/resolve-names` | Resolve member UUIDs to names |
| `POST` | `/api/members/shot-participants` | Validate shot participants |
| `POST` | `/api/members/:memberId/link-invitations` | Create an account-link invitation |
| `POST` | `/api/members/link` | Consume an account-link invitation |

## Build

Build all workspaces:

```bash
npm run build
```

Build an individual application:

```bash
npm run build:frontend
npm run build:member
npm run build:bong
```

## Tests

Run all available tests:

```bash
npm test
```

Run tests for an individual workspace:

```bash
npm test --workspace=frontend
npm test --workspace=member-api
npm test --workspace=bong-api
npm test --workspace=@valhall/auth
```

## Linting

Run frontend linting:

```bash
npm run lint --workspace=frontend
```

Run backend linting:

```bash
npm run lint --workspace=member-api
npm run lint --workspace=bong-api
```

The backend lint commands currently apply automatic fixes.

## Deployment

Production and development environments are deployed to Kubernetes using Helm and Argo CD.

The Kubernetes manifests and Helm charts are maintained separately in the `homeserver-gitops` repository.