FROM node:20-alpine AS builder
ARG NEXT_PUBLIC_API_URL=http://185.245.183.123:3000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS prod
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# public/ is NOT part of the standalone trace, so it must be copied explicitly.
# Without this every static asset (/icon.svg, /globe.svg, ...) 404s in production.
COPY --from=builder /app/public ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
