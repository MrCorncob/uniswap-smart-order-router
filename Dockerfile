FROM node:16

# Create app directory
WORKDIR /usr/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install --legacy-peer-deps
RUN npm install -g pm2

# Bundle app source
COPY . .
RUN NODE_ENV=production npm run build

EXPOSE 3000
CMD [ "pm2-runtime", "build/main/src/http.js" ]
