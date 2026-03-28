# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files
COPY package*.json ./
# Copy workspace packages
COPY packages/ui ./packages/ui
COPY apps/api ./apps/api

# Install all dependencies (monorepo)
RUN npm install

# Build the api
RUN npm run build -w @mandaapp/api

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy essential files for install
COPY package*.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/ui/package.json ./packages/ui/

# Install ONLY production dependencies for the entire monorepo
# This is the safest way to ensure all workspace symlinks are correctly handled in the container.
RUN npm install --omit=dev

# Copy the built code from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
