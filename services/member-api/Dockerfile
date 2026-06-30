FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY packages/auth/package.json ./packages/auth/package.json
COPY services/member-api/package.json ./services/member-api/package.json
COPY services/bong-api/package.json ./services/bong-api/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci

COPY packages/auth ./packages/auth
COPY services/member-api ./services/member-api
RUN npm exec --workspace=member-api -- prisma generate
RUN npm run build --workspace=member-api


FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/auth ./packages/auth
COPY --from=build /app/services/member-api/package.json ./services/member-api/package.json
COPY --from=build /app/services/member-api/dist ./services/member-api/dist
COPY --from=build /app/services/member-api/prisma ./services/member-api/prisma
COPY --from=build /app/services/member-api/prisma.config.ts ./services/member-api/prisma.config.ts

EXPOSE 3002

CMD ["npm", "run", "start:docker", "--workspace=member-api"]
