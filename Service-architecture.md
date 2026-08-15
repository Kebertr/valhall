# Valhall Architecture

This document describes the current services and databases used by Valhall.

## Services

```mermaid
flowchart LR
    User[User browser]
    Frontend[React frontend]
    Keycloak[Keycloak]
    BongAPI[Bong API<br/>NestJS :3001]
    MemberAPI[Member API<br/>NestJS :3002]
    BongDB[(Bong PostgreSQL)]
    MemberDB[(Member PostgreSQL)]

    User --> Frontend
    Frontend -->|Login| Keycloak
    Keycloak -->|JWT access token| Frontend

    Frontend -->|REST + JWT<br/>shots, activity, redemptions| BongAPI
    Frontend -->|REST + JWT<br/>members and account linking| MemberAPI

    BongAPI -->|Internal HTTP + forwarded JWT| MemberAPI

    BongAPI -->|Prisma| BongDB
    MemberAPI -->|Prisma| MemberDB

    BongAPI -->|Validate JWT| Keycloak
    MemberAPI -->|Validate JWT| Keycloak
```

### Frontend

The React frontend provides the user interface and authenticates users through Keycloak.

It communicates with the backend services using REST and JSON.

### Bong API

The Bong API manages:

- Adding bongar
- Recent activity
- Redemptions
- Validation of shot senders and recipients through the Member API

The service owns the Bong PostgreSQL database.

### Member API

The Member API manages:

- Member records
- Member statuses and roles
- Keycloak account connections
- Account-link invitations
- Shot-target validation
- Resolving member UUIDs to names

The service owns the Member PostgreSQL database.

### Service communication

The Bong API currently communicates with the Member API using internal HTTP requests.

The authenticated user's JWT is forwarded in the `Authorization` header so the Member API can validate the request.

```http
Authorization: Bearer <token>
```

The services may use gRPC for internal communication in the future, but gRPC is not currently implemented.

## Databases

Valhall currently uses two separate PostgreSQL databases.

Each microservice owns its database. A service should not query another service's database directly.

```mermaid
flowchart LR
    BongAPI[Bong API]
    MemberAPI[Member API]

    BongDB[(Bong database)]
    MemberDB[(Member database)]

    BongAPI -->|Owns and queries| BongDB
    MemberAPI -->|Owns and queries| MemberDB

    BongAPI -->|Requests member data through API| MemberAPI
```

## Member database

```mermaid
erDiagram
    MEMBER {
        uuid id PK
        int memberId UK
        string keycloakId UK "nullable"
        string name
        string godname UK
        string avatarUrl "nullable"
        MemberStatus status
        string role "nullable"
        datetime createdAt
        datetime updatedAt
    }

    MEMBER_ACCOUNT_LINK {
        uuid id PK
        string tokenHash UK
        uuid memberRecordId FK,UK
        datetime expiresAt
        datetime usedAt "nullable"
        datetime createdAt
    }

    MEMBER ||--o| MEMBER_ACCOUNT_LINK : "has optional link"
```

### Member

`Member.id` is the internal UUID used to identify a member across services.

`Member.memberId` is an automatically incremented member number.

`Member.keycloakId` stores the Keycloak `sub` value after a member connects their account. It remains `NULL` until the account is connected.

Possible member statuses are:

- `VIKING`
- `GUD`
- `AS`

### MemberAccountLink

`MemberAccountLink` stores temporary account-link invitations.

The raw invitation token is not stored. Only its SHA-256 hash is saved in `tokenHash`.

Each member can have at most one current account-link record because `memberRecordId` is unique.

Deleting a member also deletes its account-link record.

## Bong database

```mermaid
erDiagram
    ADD {
        uuid id PK
        uuid fromId
        uuid toId
        uuid acceptedId "nullable"
        int amount
        string reason
        approveStatus status
        datetime createdAt
    }

    REDEMPTION {
        uuid id PK
        uuid toId
        uuid acceptedId "nullable"
        int amount
        string videoUrl
        approveStatus status
        datetime createdAt
        datetime reviewedAt "nullable"
    }
```

Possible approval statuses are:

- `PENDING`
- `APPROVED`
- `DENIED`

### Add

An `Add` row represents bongar given from one member to another.

- `fromId` is the sender's Member UUID.
- `toId` is the recipient's Member UUID.
- `acceptedId` can store the UUID of the member who reviews the entry.
- `amount` contains the number of bongar.
- `reason` explains why they were given.

### Redemption

A `Redemption` row represents a request to redeem bongar.

- `toId` identifies the member associated with the redemption.
- `acceptedId` can identify the reviewing member.
- `amount` contains the redeemed amount.
- `videoUrl` identifies the submitted video.
- `reviewedAt` is set when the request is reviewed.

## Cross-service member references

The Bong database stores Member UUIDs, but it does not have foreign-key constraints to the Member database.

```mermaid
flowchart LR
    AddFrom[Add.fromId]
    AddTo[Add.toId]
    AddAccepted[Add.acceptedId]
    RedemptionTo[Redemption.toId]
    RedemptionAccepted[Redemption.acceptedId]
    MemberID[Member.id]

    AddFrom -. "logical UUID reference" .-> MemberID
    AddTo -. "logical UUID reference" .-> MemberID
    AddAccepted -. "logical UUID reference" .-> MemberID
    RedemptionTo -. "logical UUID reference" .-> MemberID
    RedemptionAccepted -. "logical UUID reference" .-> MemberID
```

These are logical references rather than database-enforced relationships because the records live in separate PostgreSQL databases.

The Bong API asks the Member API to validate UUIDs and resolve member names. This preserves service ownership and prevents the Bong API from accessing the Member database directly.

## Account-link flow

```mermaid
sequenceDiagram
    actor Admin
    actor Member
    participant Frontend
    participant Keycloak
    participant MemberAPI as Member API
    participant MemberDB as Member database

    Admin->>MemberAPI: Create link invitation
    MemberAPI->>MemberDB: Store token hash and Member UUID
    MemberAPI-->>Admin: Return invitation URL

    Member->>Frontend: Open invitation URL
    Member->>Keycloak: Log in
    Keycloak-->>Frontend: Return JWT

    Frontend->>MemberAPI: Send invitation token and JWT
    MemberAPI->>MemberDB: Find invitation by token hash
    MemberAPI->>MemberDB: Store JWT sub as keycloakId
    MemberAPI->>MemberDB: Mark invitation as used
    MemberAPI-->>Frontend: Return linked member
```

## Adding bongar

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant BongAPI as Bong API
    participant MemberAPI as Member API
    participant MemberDB as Member database
    participant BongDB as Bong database

    User->>Frontend: Select member and amount
    Frontend->>BongAPI: POST /api/add with JWT
    BongAPI->>MemberAPI: Validate participants with JWT
    MemberAPI->>MemberDB: Find sender by Keycloak ID
    MemberAPI->>MemberDB: Validate target Member UUID
    MemberAPI-->>BongAPI: Return fromId and toId
    BongAPI->>BongDB: Create Add row
    BongAPI-->>Frontend: Return success
```

## Planned additions

The following components are planned but are not part of the current database implementation:

- MinIO storage for redemption videos
- Redis caching for the scoreboard
- WebSockets for live activity updates
- gRPC for internal microservice communication

PostgreSQL will remain the permanent source of truth when Redis is introduced.