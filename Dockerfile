# Office Werkstatt server image – no dependencies, runs fully offline
#   docker run -d --name office-werkstatt -p 8080:8080 -v office-werkstatt:/data ghcr.io/smyrna-pergamum/office-werkstatt
# On the first start (no account yet) open http://<server>:8080/setup and create the administrator –
# the setup code is in `docker logs office-werkstatt`. Published for every release (linux/amd64, linux/arm64).
FROM node:20-alpine
ARG VERSION=dev
LABEL org.opencontainers.image.title="Office Werkstatt" \
      org.opencontainers.image.description="Integrated offline office suite – server (Word, Excel, Slide, Note, Draw, PDF, Design, Form, AI Werkzeug)" \
      org.opencontainers.image.source="https://github.com/smyrna-pergamum/office-werkstatt" \
      org.opencontainers.image.url="https://github.com/smyrna-pergamum/office-werkstatt" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}"
WORKDIR /app
COPY server ./server
COPY public ./public
COPY package.json ./
# inside the container the server listens on all interfaces; without an account it starts in setup mode (/setup)
ENV PORT=8080 HOST=0.0.0.0 DATA_DIR=/data OW_VERSION=${VERSION}
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8080
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server/server.js"]
