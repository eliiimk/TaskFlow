FROM nginx:alpine

# Labels OCI
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="DevOps Engineer"
LABEL org.opencontainers.image.source="https://github.com/eliiimk/taskflow"

# Copie de la configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers statiques
COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]