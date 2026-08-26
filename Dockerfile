FROM node:24-alpine AS base

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base as backend-dependencies
COPY packages/auth/package.json ./packages/auth/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY services/videos-api/package.json ./services/videos-api/package.json
COPY services/penalty-api/package.json ./services/penalty-api/package.json
COPY services/member-api/package.json ./services/member-api/package.json

RUN pnpm install --frozen-lockfile

FROM base as frontend-dependencies
COPY frontend/package.json ./frontend/package.json

RUN pnpm install --filter frontend... --frozen-lockfile

#penalty
FROM backend-dependencies AS penalty-build

COPY packages/auth packages/auth
COPY packages/contracts packages/contracts
COPY proto proto
COPY services/penalty-api services/penalty-api

RUN pnpm --filter penalty-api exec prisma generate
RUN pnpm --filter penalty-api build

#penalty run
FROM node:24-alpine AS penalty-runtime

WORKDIR /app/services/penalty-api

ENV NODE_ENV=production

COPY  --chown=node:node --from=penalty-build /app/node_modules /app/node_modules
COPY  --chown=node:node --from=penalty-build /app/services/penalty-api/node_modules ./node_modules
COPY  --chown=node:node --from=penalty-build /app/packages /app/packages
COPY  --chown=node:node --from=penalty-build /app/services/penalty-api/dist ./dist
COPY  --chown=node:node --from=penalty-build /app/services/penalty-api/package.json ./package.json
COPY  --chown=node:node --from=penalty-build /app/proto /app/proto

EXPOSE 3001

USER node

CMD ["node", "dist/src/main.js"]

#member
FROM backend-dependencies AS member-build

COPY packages/auth packages/auth
COPY packages/contracts packages/contracts
COPY proto proto
COPY services/member-api services/member-api

RUN pnpm --filter member-api exec prisma generate
RUN pnpm --filter member-api build

#member run
FROM node:24-alpine AS member-runtime

WORKDIR /app/services/member-api

ENV NODE_ENV=production

COPY  --chown=node:node --from=member-build /app/node_modules /app/node_modules
COPY  --chown=node:node --from=member-build /app/services/member-api/node_modules ./node_modules
COPY  --chown=node:node --from=member-build /app/packages /app/packages
COPY  --chown=node:node --from=member-build /app/services/member-api/dist ./dist
COPY  --chown=node:node --from=member-build /app/services/member-api/package.json ./package.json
COPY  --chown=node:node --from=member-build /app/proto /app/proto

EXPOSE 3001

USER node

CMD ["node", "dist/src/main.js"]

#videos
FROM backend-dependencies AS videos-build

COPY packages/auth packages/auth
COPY packages/contracts packages/contracts
COPY proto proto
COPY services/videos-api services/videos-api

RUN pnpm --filter videos-api exec prisma generate
RUN pnpm --filter videos-api build

#videos run
FROM node:24-alpine AS videos-runtime

WORKDIR /app/services/videos-api

ENV NODE_ENV=production

COPY  --chown=node:node --from=videos-build /app/node_modules /app/node_modules
COPY  --chown=node:node --from=videos-build /app/services/videos-api/node_modules ./node_modules
COPY  --chown=node:node --from=videos-build /app/packages /app/packages
COPY  --chown=node:node --from=videos-build /app/services/videos-api/dist ./dist
COPY  --chown=node:node --from=videos-build /app/services/videos-api/package.json ./package.json
COPY  --chown=node:node --from=videos-build /app/proto /app/proto

EXPOSE 3001

USER node

CMD ["node", "dist/src/main.js"]

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

FROM nginx:alpine AS frontend-runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
