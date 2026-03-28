# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files
COPY package*.json ./
# Copy workspace packages
COPY packages/ui ./packages/ui
COPY apps/web ./apps/web

# Install dependencies
RUN npm install

# Build the web app
RUN npm run build -w @mandaapp/web

# Stage 2: Serve with Nginx for single-page app (SPA)
FROM nginx:stable-alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
