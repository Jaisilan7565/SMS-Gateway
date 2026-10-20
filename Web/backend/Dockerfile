# Production Dockerfile for Render deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Start server
CMD ["node", "server.js"]
