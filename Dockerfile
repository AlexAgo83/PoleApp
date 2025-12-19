# Multi-stage build for Next.js app (web/)
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

FROM deps AS dev
WORKDIR /app
COPY . .
RUN npx prisma generate

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/prisma ./prisma
# Ensure NextAuth secrets provided at runtime.
EXPOSE 3000
CMD ["npm", "run", "start"]
