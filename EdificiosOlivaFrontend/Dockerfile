FROM node:24-alpine AS build
WORKDIR /app

COPY EdificiosOlivaFrontend/package.json EdificiosOlivaFrontend/package-lock.json ./
RUN npm ci

COPY EdificiosOlivaFrontend/ ./
RUN npm run build

FROM nginx:1.29-alpine AS runtime
COPY EdificiosOlivaFrontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ResidencialOliva/browser /usr/share/nginx/html

EXPOSE 80
