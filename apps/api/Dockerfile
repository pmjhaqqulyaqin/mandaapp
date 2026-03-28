# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files
COPY package*.json ./
# Copy workspace packages
COPY packages/ui ./packages/ui
COPY apps/api ./apps/api

# Install dependencies
RUN npm install

# Build the api
RUN npm run build -w @mandaapp/api

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
