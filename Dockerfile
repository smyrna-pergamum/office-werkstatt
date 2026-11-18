# Office Werkstatt server image – no dependencies, runs fully offline
FROM node:20-alpine
WORKDIR /app
COPY server ./server
COPY public ./public
COPY package.json ./
ENV PORT=8080 DATA_DIR=/data
VOLUME /data
EXPOSE 8080
RUN mkdir -p /data && chown node:node /data
USER node
CMD ["node", "server/server.js"]
