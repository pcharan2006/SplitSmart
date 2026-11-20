# ---------- Stage 1: install only the production dependencies ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Stage 2: the small image that actually runs ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY database ./database
COPY scripts ./scripts

# Avatars are stored here. Mount a volume at /app/uploads in production so they survive redeploys.
RUN mkdir -p uploads && chown -R node:node /app/uploads

# Never run as root inside the container.
USER node

EXPOSE 5000

# "Healthy" means the API answers AND can reach MySQL.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
