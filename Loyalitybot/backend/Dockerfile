# Dockerfile для продакшена backend
FROM node:23

# Install CA certificates to ensure SSL/TLS verification
RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates

# Set the working directory
WORKDIR /app

# Copy the package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of your application
COPY . .

# Expose port
EXPOSE 8000

# Run in production mode
CMD ["node", "index.js"] 