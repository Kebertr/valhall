FROM node:24-alpine AS base

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base as backend-dependencies
COPY packages/auth/package.json ./packages/auth/package.json
COPY services/videos-api/package.json ./services/videos-api/package.json
COPY services/bong-api/package.json ./services/bong-api/package.json
COPY services/member-api/package.json ./services/member-api/package.json

RUN pnpm install --frozen-lockfile

FROM base as frontend-dependencies
COPY frontend/package.json ./frontend/package.json

RUN pnpm install --filter frontend... --frozen-lockfile

#bong
FROM backend-dependencies AS bong-build

COPY packages/auth packages/auth
COPY proto proto
COPY services/bong-api services/bong-api

RUN pnpm --filter bong-api exec prisma generate
RUN pnpm --filter bong-api build

#bong run
From node:24-alpine AS bong-runtime

RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production

COPY --from=bong-build /app/package.json ./
COPY --from=bong-build /app/pnpm-lock.yaml ./
COPY --from=bong-build /app/pnpm-workspace.yaml ./
COPY --from=bong-build /app/node_modules ./node_modules
COPY --from=bong-build /app/packages ./packages
COPY --from=bong-build /app/services/bong-api ./services/bong-api
COPY --from=bong-build /app/proto ./proto

EXPOSE 3001

CMD ["pnpm", "--filter", "bong-api", "start:docker"]

#member
FROM backend-dependencies AS member-build

COPY packages/auth packages/auth
COPY proto proto
COPY services/member-api services/member-api

RUN pnpm --filter member-api exec prisma generate
RUN pnpm --filter member-api build

#member run
FROM node:24-alpine AS member-runtime

RUN corepack enable

WORKDIR /app

ENV NODE_ENV=production

COPY --from=member-build /app/package.json ./
COPY --from=member-build /app/pnpm-lock.yaml ./
COPY --from=member-build /app/pnpm-workspace.yaml ./
COPY --from=member-build /app/node_modules ./node_modules
COPY --from=member-build /app/packages ./packages
COPY --from=member-build /app/services/member-api ./services/member-api
COPY --from=member-build /app/proto ./proto

EXPOSE 3002

CMD ["pnpm", "--filter", "member-api", "start:docker"]

#videos
FROM backend-dependencies AS videos-build

COPY packages/auth packages/auth
COPY proto proto
COPY services/videos-api services/videos-api

RUN pnpm --filter videos-api exec prisma generate
RUN pnpm --filter videos-api build

#videos run
FROM node:24-alpine AS videos-runtime

RUN corepack enable

WORKDIR /app

ENV NODE_ENV=production

COPY --from=videos-build /app/package.json ./
COPY --from=videos-build /app/pnpm-lock.yaml ./
COPY --from=videos-build /app/pnpm-workspace.yaml ./
COPY --from=videos-build /app/node_modules ./node_modules
COPY --from=videos-build /app/packages ./packages
COPY --from=videos-build /app/services/videos-api ./services/videos-api
COPY --from=videos-build /app/proto ./proto

EXPOSE 3003

CMD ["pnpm", "--filter", "videos-api", "start:docker"]


#frontend
FROM frontend-dependencies AS frontend-build

COPY frontend frontend

ARG VITE_API_URL
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

RUN pnpm --filter frontend build

FROM frontend-build AS frontend-runtime

EXPOSE 5173

CMD ["pnpm", "--filter", "frontend", "run", "preview", "--", "--host", "0.0.0.0"]
