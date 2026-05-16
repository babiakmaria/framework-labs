#  Stage 1: production dependencies
# argon2 has native C bindings compiled via node-gyp; build tools stay here only
FROM node:22-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev --ignore-scripts=false


#  Stage 2: all dependencies (prod + dev)
FROM node:22-alpine AS deps-dev

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --ignore-scripts=false


#  Stage 3: production runner
FROM node:22-alpine AS runner

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY src ./src
COPY drizzle ./drizzle
COPY drizzle.config.js ./
COPY package.json ./
COPY entrypoint.sh ./

RUN mkdir -p uploads data/backups \
    && chmod +x entrypoint.sh \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "src/app.js"]


#  Stage 4: development
# source is mounted as a volume — only node_modules are baked in
FROM deps-dev AS development

ENV NODE_ENV=development

WORKDIR /app

COPY package.json ./
COPY entrypoint.sh ./

RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "--watch", "src/app.js"]
