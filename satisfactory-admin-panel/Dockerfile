FROM node:18-alpine

WORKDIR /app

# Install Docker client
RUN apk add --no-cache docker-cli

# Copy package.json files and install dependencies
COPY package*.json ./
RUN npm install

# Create necessary directories
RUN mkdir -p src/views public

# Copy application files
COPY src ./src
COPY public ./public
COPY .env ./.env

EXPOSE 3000

CMD ["npm", "start"]