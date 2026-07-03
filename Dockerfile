# Photo Wall v2 — imagem única rodando o backend (que também serve os
# builds estáticos do telão e do painel). Pensada para PaaS com container
# persistente (Railway, Fly.io, Render Docker, etc.) — não serverless,
# porque o processo mantém WebSocket e um watcher de pasta em memória.

FROM node:22-slim AS build
WORKDIR /app

# Copia manifests primeiro para cache de `npm ci` entre builds.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/wall/package.json apps/wall/
COPY apps/admin/package.json apps/admin/
RUN npm ci

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server apps/server
COPY apps/wall apps/wall
COPY apps/admin apps/admin
RUN npm run build

# ---- imagem final: só o necessário para rodar o server ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/server/package.json apps/server/package.json
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/wall/dist apps/wall/dist
COPY --from=build /app/apps/admin/dist apps/admin/dist

EXPOSE 4700
CMD ["node", "apps/server/dist/index.js"]
