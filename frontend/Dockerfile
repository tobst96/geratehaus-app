FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 127.0.0.1 statt localhost: localhost löst im Container zuerst auf IPv6 (::1)
# auf, nginx lauscht aber nur auf IPv4 (listen 80;) → sonst „Connection refused"
# und der Container wird fälschlich als „unhealthy" gemeldet.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O- http://127.0.0.1:80/ || exit 1

EXPOSE 80
