# Step 1: Build React (Vite)
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build for production (Vite automatically loads .env.production)
RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:alpine

# Clean default Nginx HTML
RUN rm -rf /usr/share/nginx/html/*

# Use custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy Vite build output
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
