# Office Werkstatt server image – no dependencies, runs fully offline
FROM node:20-alpine
WORKDIR /app
COPY server ./server
COPY public ./public
COPY package.json ./
# inside the container the server must listen on all interfaces; OW_USER/OW_PASS are required then
ENV PORT=8080 HOST=0.0.0.0 DATA_DIR=/data
VOLUME /data
EXPOSE 8080
RUN mkdir -p /data && chown node:node /data
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server/server.js"]
