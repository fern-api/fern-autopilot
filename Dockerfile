# Production Dockerfile - runs TypeScript directly with Node.js --experimental-strip-types
# No build stage needed - TypeScript runs directly
FROM node:24-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install goose v3.22.1 for database migrations
RUN apk add --no-cache curl && \
    curl -fsSL https://raw.githubusercontent.com/pressly/goose/master/install.sh | GOOSE_VERSION=v3.22.1 sh && \
    apk del curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy source code (no build step needed - runs TypeScript directly)
COPY src ./src

# Copy scripts and migrations for running migrations in cloud environment
COPY scripts ./scripts
COPY src/database/migrations ./src/database/migrations

# Make scripts executable
RUN chmod +x scripts/*.sh

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application with --experimental-strip-types
CMD ["node", "--experimental-strip-types", "src/index.ts"]
