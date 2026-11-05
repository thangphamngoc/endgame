# Trống Hội & Cầu Khỉ — image chạy game (Node 20, không build step).
FROM node:20-alpine

WORKDIR /app

# Cài phụ thuộc trước để tận dụng cache layer.
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Chạy bằng user không phải root.
RUN addgroup -S app && adduser -S app -G app \
  && mkdir -p /app/data && chown -R app:app /app
USER app

EXPOSE 3000

CMD ["node", "server/server.js"]
