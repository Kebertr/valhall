# Valhall

Valhall is a web application for managing members, bongar, recent activity, account linking, and redemptions.

The project is structured as a pnpm workspace containing a React frontend, NestJS microservices, and a shared authentication package.

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

- Node.js and pnpm (Corepack is recommended)
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

## MinIO bucket access

Valhall uses private MinIO buckets. Applications must use restricted access
keys; never configure the MinIO administrator credentials in an API.

Use separate identities for development and production:

| Environment | Identity | Buckets |
| --- | --- | --- |
| Development | `valhall-media-dev` | `valhall-videos-dev` and, later, `valhall-profiles-dev` |
| Production | `valhall-media-prod` | `valhall-videos` and, later, `valhall-profiles` |

Development credentials must not have access to production buckets.

On Arch Linux, install the MinIO client. Its binary is named `mcli`

```bash
sudo pacman -S minio-client
mcli --version
```

Configure an administrative alias using the MinIO API endpoint, not the object
browser on port `9001`. The endpoint must include its scheme:

```bash
mcli alias set \
  valhall-admin \
  https://MINIO_ADMIN_API \
  ADMIN_ACCESS_KEY \
  ADMIN_SECRET_KEY
```

Keep administrator credentials out of shell history where possible and remove
the alias after administration if it is not needed regularly.

Create a temporary development policy file outside the repository, for example
`/tmp/valhall-media-dev-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::valhall-videos-dev"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::valhall-videos-dev/*"
      ]
    }
  ]
}
```

When the profile-image bucket is created, add its bucket ARN to the first
resource list and its `/*` object ARN to the second list. Create a restricted
development access key:

```bash
mcli admin accesskey create \
  valhall-admin \
  --name valhall-media-dev \
  --policy /tmp/valhall-media-dev-policy.json
```

Save the generated access and secret keys immediately; the secret cannot be
retrieved later. Configure `videos-api` locally with:

```dotenv
MINIO_ENDPOINT=upload.kebert.se
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_VIDEO_BUCKET=valhall-videos-dev
MINIO_ACCESS_KEY=generated-development-access-key
MINIO_SECRET_KEY=generated-development-secret-key
MAX_VIDEO_SIZE_BYTES=250000000
UPLOAD_EXPIRY_SECONDS=900
```

Production follows the same process with a different access key and a policy
that references only production buckets. Store production credentials in
Kubernetes Secrets, not in Git or a Docker image.


## Install dependencies

Run from the repository root:

```bash
corepack enable
pnpm install
```

```bash
pnpm --filter bong-api add class-validator@^0.15.1
pnpm --filter bong-api add class-transformer@^0.5.1
pnpm --filter bong-api add minio
pnpm --filter videos-api add @nestjs/config minio
```

Because the project uses a pnpm workspace, this installs dependencies for the frontend, services, and shared packages. If pnpm reports ignored dependency build scripts on the first install, review them with `pnpm approve-builds` and run `pnpm install` again.

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

## Run services with pnpm

Start the PostgreSQL containers:

```bash
docker compose up -d postgres-bong postgres-member
```

Run each application in a separate terminal:

```bash
pnpm start:member
```

```bash
pnpm start:bong
```

```bash
pnpm start:videos
```

```bash
pnpm start:frontend
```

## Prisma

```nest new videos-api```

Go into videos-api directory
```pnpm add prisma --save-dev```

```pnpm add @prisma/client @prisma/adapter-pg pg```

```pnpm dlx prisma init --output ../src/generated/prisma```


Generate both Prisma clients:

```bash
pnpm --filter member-api exec prisma generate
pnpm --filter bong-api exec prisma generate
pnpm --filter videos-api exec prisma generate
```

Run development migrations from the relevant service:

```bash
pnpm --filter member-api exec prisma migrate dev
pnpm --filter bong-api exec prisma migrate dev
pnpm --filter videos-api exec prisma migrate dev
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
pnpm build
```

Build an individual application:

```bash
pnpm build:frontend
pnpm build:member
pnpm build:bong
pnpm build:videos
```

## Tests

Run all available tests:

```bash
pnpm test
```

Run tests for an individual workspace:

```bash
pnpm --filter frontend test
pnpm --filter member-api test
pnpm --filter bong-api test
pnpm --filter @valhall/auth test
```

## Linting

Run frontend linting:

```bash
pnpm --filter frontend lint
```

Run backend linting:

```bash
pnpm --filter member-api lint
pnpm --filter bong-api lint
```

The backend lint commands currently apply automatic fixes.

## Deployment

Production and development environments are deployed to Kubernetes using Helm and Argo CD.

The Kubernetes manifests and Helm charts are maintained separately in the `homeserver-gitops` repository.
