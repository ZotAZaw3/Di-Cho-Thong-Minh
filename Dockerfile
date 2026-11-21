FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts
COPY db ./db
RUN mkdir -p uploads && chown node:node uploads

USER node
EXPOSE 3000
# Áp migration trước khi chạy: docker compose run --rm api npm run db:migrate
CMD ["node", "src/server.js"]
