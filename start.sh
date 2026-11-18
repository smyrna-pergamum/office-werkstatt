#!/bin/sh
# Office Werkstatt – start the local server (no internet needed)
cd "$(dirname "$0")"
( sleep 1; (xdg-open http://localhost:8080 || open http://localhost:8080) >/dev/null 2>&1 ) &
exec node server/server.js
