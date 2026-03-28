# Google Cloud Run Optimized Node.js Environment
FROM node:20-alpine

# Security & Efficiency: Don't run as root user in production
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

# Only copy package files to optimize Docker layer build cache (Efficiency)
COPY --chown=node:node package*.json ./

USER node

# Production strict install (ignores devDependencies)
RUN npm ci --omit=dev

# Copy the rest of the application files securely bound to the node user
COPY --chown=node:node . .

# Google Cloud sets PORT dynamically (defaults to 8080)
ENV PORT 8080
EXPOSE $PORT

# Security: Launch using node instead of npm scripts for better process OS signaling
CMD ["node", "server.js"]
