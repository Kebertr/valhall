FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/auth/package.json ./packages/auth/package.json
COPY services/member-api/package.json ./services/member-api/package.json
COPY services/bong-api/package.json ./services/bong-api/package.json
COPY services/videos-api/package.json ./services/videos-api/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile

COPY packages/auth ./packages/auth
COPY services/member-api ./services/member-api
RUN pnpm --filter member-api exec prisma generate
RUN pnpm --filter member-api build


FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/auth ./packages/auth
COPY --from=build /app/services/member-api/package.json ./services/member-api/package.json
COPY --from=build /app/services/member-api/node_modules ./services/member-api/node_modules
COPY --from=build /app/services/member-api/dist ./services/member-api/dist
COPY --from=build /app/services/member-api/prisma ./services/member-api/prisma
COPY --from=build /app/services/member-api/prisma.config.ts ./services/member-api/prisma.config.ts

EXPOSE 3002

CMD ["pnpm", "--filter", "member-api", "start:docker"]
