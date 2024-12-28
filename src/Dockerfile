FROM oven/bun:1.0.25

WORKDIR /app

# Copy package files
COPY package.json .
COPY bun.lockb .
COPY tsconfig.json .
COPY prisma ./prisma

# Install dependencies
RUN bun install

# Generate Prisma client
RUN bunx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN bun run build

EXPOSE 3000

# Run the built version
CMD ["bun", "dist/index.js"] 
