# Étape de build
FROM alpine:3.19 AS build
RUN apk add --no-cache nodejs npm
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Étape de production
FROM alpine:3.19
RUN apk add --no-cache nodejs npm && \
    addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node

WORKDIR /app

# Labels OCI
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="DevOps Engineer"
LABEL org.opencontainers.image.source="https://github.com/eliiimk/taskflow"

# Copie depuis l'étape de build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server.js ./server.js

# Changer les permissions pour l'utilisateur non-root
RUN chown -R node:node /app

# Utilisation d'un utilisateur non-root
USER node

# Exposition du port
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Lancement
CMD ["npm", "start"]
