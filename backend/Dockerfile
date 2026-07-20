FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/boss', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Container port (should match BACKEND_PORT env var)
EXPOSE 3001

# Start application
CMD ["npm", "start"]

