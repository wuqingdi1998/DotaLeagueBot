ARG REPLAY_PARSER_STAGE=replay-parser-builder

FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM golang:1.24-alpine AS replay-parser-builder
WORKDIR /src
COPY tools/arcana-replay-parser/go.mod tools/arcana-replay-parser/go.sum ./
RUN go mod download
COPY tools/arcana-replay-parser ./
RUN go test ./... \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/arcana-replay-parser .

FROM scratch AS replay-parser-prebuilt
COPY tools/arcana-replay-parser/bin/arcana-replay-parser /out/arcana-replay-parser

FROM ${REPLAY_PARSER_STAGE} AS replay-parser-final

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p /data/uploads \
    && chown -R nextjs:nodejs /data
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=replay-parser-final /out/arcana-replay-parser /usr/local/bin/arcana-replay-parser
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
