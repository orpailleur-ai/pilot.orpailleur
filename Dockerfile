FROM node:20-alpine AS builder
# La valeur par defaut doit rester unnom + HTTPS : le navigateur bloque
# tout http:// depuis une page servie en HTTPS (mixed content), et le
# build fige NEXT_PUBLIC_* dans le bundle client. Un defaut en http://
# ou vers une IP ancienne produit une app silencieusement cassee.
ARG NEXT_PUBLIC_API_URL=https://pilot.orpailleur-software.fr/api/v1
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
