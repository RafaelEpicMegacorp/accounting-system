# Multi-stage build for Node.js backend
FROM node:18-alpine AS backend-builder

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/

# Install backend dependencies
RUN cd backend && npm ci --only=production

# Copy backend source
COPY backend ./backend

# Generate Prisma client and build
RUN cd backend && npx prisma generate && npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start command
CMD ["node", "backend/dist/server.js"]