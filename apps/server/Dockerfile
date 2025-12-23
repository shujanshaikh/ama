FROM oven/bun:1.1.38 AS base
WORKDIR /app

# Copy root package files  
COPY package.json bun.lock ./
COPY bunfig.toml ./

# Copy ALL workspace package.json files for dependency resolution
COPY apps/server/package.json ./apps/server/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/

# Install all dependencies
RUN bun install

# Copy source code
COPY apps/server ./apps/server
COPY packages/db ./packages/db
COPY packages/config ./packages/config

WORKDIR /app/apps/server

# Set environment
ENV NODE_ENV=production

# Expose the port (Railway will set PORT env var)
EXPOSE 3000

# Run the server with Bun (required for WebSocket support via hono/bun)
CMD ["bun", "run", "src/index.ts"]
