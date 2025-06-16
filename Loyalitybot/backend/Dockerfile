FROM node:23

# Install CA certificates to ensure SSL/TLS verification
RUN apt-get install -y ca-certificates && update-ca-certificates

# Set the working directory
WORKDIR /app

# Copy the package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application
COPY . .

# Set the command to run your app
CMD ["node", "index.js"]