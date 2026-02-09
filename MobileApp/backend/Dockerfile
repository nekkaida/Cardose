FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

COPY --from=builder /app .

RUN mkdir -p data uploads backups

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
