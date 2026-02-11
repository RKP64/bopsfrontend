# Stage 1: Build React app with Vite
FROM node:20.19 AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with NGINX and proxy API calls
FROM nginx:alpine

# Copy React build to NGINX html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom NGINX config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Ensure nginx has proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 8000
EXPOSE 8000

# Start NGINX in foreground
CMD ["nginx", "-g", "daemon off;"]
