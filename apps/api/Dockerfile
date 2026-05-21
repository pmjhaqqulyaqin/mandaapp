FROM node:20-alpine
WORKDIR /app

# Install system dependencies: git, docker-cli, and Chromium for Puppeteer PDF generation
RUN apk add --no-cache git docker-cli docker-cli-compose \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-cjk

# Tell Puppeteer to use system Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 1. Copy root package files
COPY package*.json ./

# 2. Copy workspace package files
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/

# 3. Install ALL dependencies (monorepo)
RUN npm install

# 4. Copy source code (respects .dockerignore)
COPY packages/ui ./packages/ui
COPY apps/api ./apps/api

# 5. Build the api
RUN npm run build -w @mandaapp/api

ENV NODE_ENV=production
EXPOSE 3001

# The path to the built entry point
CMD ["node", "apps/api/dist/index.js"]
