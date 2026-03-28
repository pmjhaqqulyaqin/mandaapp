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

# Copy EVERYTHING from builder stage to preserve all symlinks and workspace structures
COPY --from=builder /app /app

EXPOSE 3001

# The path to the built entry point
CMD ["node", "apps/api/dist/index.js"]
