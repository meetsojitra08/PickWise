FROM node:24-alpine

WORKDIR /app

EXPOSE 5173

CMD ["sh", "-c", "if [ ! -f package.json ]; then echo 'Waiting for frontend/package.json (created in P0-S6)...'; while [ ! -f package.json ]; do sleep 5; done; fi; if [ ! -d node_modules ] || [ -z \"$(ls -A node_modules 2>/dev/null)\" ]; then npm install; fi; exec npm run dev -- --host 0.0.0.0 --port 5173"]
