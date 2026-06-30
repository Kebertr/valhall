FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY packages/auth/package.json ./packages/auth/package.json
COPY services/member-api/package.json ./services/member-api/package.json
COPY services/bong-api/package.json ./services/bong-api/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci

COPY services/bong-api ./services/bong-api
RUN npm exec --workspace=bong-api -- prisma generate
RUN npm run build --workspace=bong-api


FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/bong-api/package.json ./services/bong-api/package.json
COPY --from=build /app/services/bong-api/dist ./services/bong-api/dist
COPY --from=build /app/services/bong-api/prisma ./services/bong-api/prisma
COPY --from=build /app/services/bong-api/prisma.config.ts ./services/bong-api/prisma.config.ts

EXPOSE 3001

CMD ["npm", "run", "start:docker", "--workspace=bong-api"]
