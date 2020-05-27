FROM node:11
WORKDIR /frontend
COPY package.json yarn.lock ./
RUN yarn install
RUN yarn run parcel --version
CMD yarn start
