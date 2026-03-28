FROM nginx:alpine

# Copy all the static HTML/CSS/JS files into the Nginx web root
COPY . /usr/share/nginx/html

# Google Cloud Run provides a PORT environment variable (default 8080)
# Nginx default configuration listens on 80, so we must replace it dynamically
ENV PORT 8080
EXPOSE $PORT

# Replace the default port 80 with the dynamic $PORT, then start Nginx
CMD ["/bin/sh", "-c", "sed -i 's/listen  *80;/listen '\"$PORT\"';/g' /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
