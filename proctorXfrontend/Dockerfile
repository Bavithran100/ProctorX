# ==============================================================================
# PROCTORX FRONTEND — PRODUCTION MULTI-STAGE DOCKERFILE
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for environment injection during container build
ARG VITE_API_BASE_URL=http://localhost:9080/api
ARG VITE_FRONTEND_URL=http://localhost:5173
ARG VITE_SITE_NAME=ProctorX
ARG VITE_APP_ENV=production

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_FRONTEND_URL=${VITE_FRONTEND_URL}
ENV VITE_SITE_NAME=${VITE_SITE_NAME}
ENV VITE_APP_ENV=${VITE_APP_ENV}

# Copy package manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

RUN npm ci --legacy-peer-deps || npm install

# Copy source code and public assets
COPY . .

# Build production bundle with Vite
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Minimal High-Performance Nginx Web Server
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production static build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
