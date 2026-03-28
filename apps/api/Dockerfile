FROM node:20-alpine
WORKDIR /app

# 1. Copy root package files
COPY package*.json ./

# 2. Copy workspace package files
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/

# 3. Install ALL dependencies (monorepo)
# Using single-stage build ensures all symlinks are correctly created in place
RUN npm install

# 4. Copy source code (respects .dockerignore)
COPY packages/ui ./packages/ui
COPY apps/api ./apps/api

# 5. Build the api
RUN npm run build -w @mandaapp/api

EXPOSE 3001

# The path to the built entry point
CMD ["node", "apps/api/dist/index.js"]
