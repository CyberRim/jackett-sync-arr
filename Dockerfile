FROM node:16-slim
WORKDIR /jackett-sync-arr
COPY package*.json ./
RUN npm install
COPY . /jackett-sync-arr
CMD ["npm","run","start"]