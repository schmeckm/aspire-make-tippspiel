FROM node:20-alpine

WORKDIR /app

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p database uploads

EXPOSE 3000

CMD ["node", "server.js"]
