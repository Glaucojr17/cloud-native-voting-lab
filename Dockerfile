FROM node:24-alpine
WORKDIR /app
COPY src ./src
USER node
CMD ["sh", "-c", "node src/${APP}.js"]
