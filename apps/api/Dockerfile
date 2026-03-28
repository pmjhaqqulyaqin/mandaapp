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

# Copy root package files
COPY package*.json ./
COPY apps/api/package.json ./apps/api/

# Install ONLY production dependencies for the api workspace
# This ensures all symlinks and peer dependencies are correctly resolved
RUN npm install --omit=dev --workspace=@mandaapp/api

# Copy the built code from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
