FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/auth/package.json ./packages/auth/package.json
COPY services/member-api/package.json ./services/member-api/package.json
COPY services/bong-api/package.json ./services/bong-api/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci

COPY frontend ./frontend

ARG VITE_API_URL
ARG VITE_KEYCLOAK_URL
ARG VITE_KEYCLOAK_REALM
ARG VITE_KEYCLOAK_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID

RUN npm run build --workspace=frontend

EXPOSE 5173

CMD ["npm", "run", "preview", "--workspace=frontend", "--", "--host", "0.0.0.0"]
