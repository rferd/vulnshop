FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

# Install serve to serve the static files
RUN npm install -g serve

COPY --from=build /app/build ./build

EXPOSE 3000

# VULNERABILITY: Serving static files without proper security headers
CMD ["serve", "-s", "build", "-l", "3000"]
