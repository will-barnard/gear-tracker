FROM node:20-alpine

WORKDIR /app

# pg_dump for the nightly backup to brew-bucket (services/backup.js).
# Major version matches the postgres:16 service.
RUN apk add --no-cache postgresql16-client

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Use entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
