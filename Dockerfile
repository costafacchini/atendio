FROM node:24-slim AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false
COPY client/package.json client/yarn.lock ./client/
RUN cd client && yarn install --frozen-lockfile

FROM node:24-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY . .
RUN yarn build:fly && cd client && yarn build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/appsignal.cjs ./appsignal.cjs
COPY --from=builder /app/start-combined.sh ./start-combined.sh
RUN chmod +x start-combined.sh

EXPOSE 5000
CMD ["sh", "start-combined.sh"]
